import type { ClientEnvelope } from "../../src/shared/protocol";
import type { Peer } from "./peer";
import { Room } from "./room";
import { makeRoomCode } from "./room-code";

/** A LAN party never needs more than this. It caps memory if someone spams. */
export const MAX_ROOMS = 200;

/**
 * Keeps every open room in memory and works out which room each socket
 * belongs to. Nothing is written to disk: when the process stops, every
 * game is gone, which is the point.
 */
export class RoomRegistry {
  private readonly rooms = new Map<string, Room>();
  private readonly bindings = new Map<Peer, Room>();

  constructor(private readonly joinUrlFor: (code: string) => string) {}

  get size(): number {
    return this.rooms.size;
  }

  /** Routes one validated message from a client. */
  handle(peer: Peer, envelope: ClientEnvelope): void {
    switch (envelope.type) {
      case "host:create":
        this.create(peer);
        return;
      case "host:resume":
        this.resumeHost(peer, envelope.code, envelope.token);
        return;
      case "phone:join":
        this.joinPhone(peer, envelope.code, envelope.token);
        return;
      case "host:close":
        this.closeHosted(peer);
        return;
      case "host:send":
        this.bindings.get(peer)?.fromHost(peer, envelope.to, envelope.payload);
        return;
      case "phone:send":
        this.bindings.get(peer)?.fromPhone(peer, envelope.payload);
        return;
    }
  }

  /** The socket closed. Its room decides whether to wait for it or not. */
  disconnect(peer: Peer): void {
    const room = this.bindings.get(peer);
    this.bindings.delete(peer);
    room?.detach(peer);
  }

  private create(peer: Peer): void {
    this.leaveCurrent(peer);
    if (this.rooms.size >= MAX_ROOMS) {
      peer.send({ type: "room:error", reason: "full" });
      return;
    }
    const code = this.uniqueCode();
    const room = new Room(code, peer, this.joinUrlFor(code), (closed) => this.forget(closed));
    this.rooms.set(code, room);
    this.bindings.set(peer, room);
    peer.send({ type: "room:created", code, token: room.hostToken, joinUrl: room.joinUrl });
  }

  private resumeHost(peer: Peer, code: string, token: string): void {
    const room = this.rooms.get(code);
    if (!room || !room.resumeHost(peer, token)) {
      peer.send({ type: "room:error", reason: "not-found" });
      return;
    }
    this.bindings.set(peer, room);
    peer.send({ type: "room:resumed", code, joinUrl: room.joinUrl, connected: room.connectedSlots() });
  }

  private joinPhone(peer: Peer, code: string, token: string | undefined): void {
    const room = this.rooms.get(code);
    if (!room || room.isClosed) {
      peer.send({ type: "room:error", reason: "not-found" });
      return;
    }
    this.leaveCurrent(peer);
    const result = room.joinPhone(peer, token);
    if (!result.ok) {
      peer.send({ type: "room:error", reason: result.reason });
      return;
    }
    this.bindings.set(peer, room);
    peer.send({ type: "phone:joined", code, slot: result.slot, token: result.token });
  }

  /** A socket that switches rooms leaves the old one cleanly first. */
  private leaveCurrent(peer: Peer): void {
    const current = this.bindings.get(peer);
    if (!current) return;
    this.bindings.delete(peer);
    current.detach(peer);
  }

  /** Only the room's own host may close it. */
  private closeHosted(peer: Peer): void {
    const room = this.bindings.get(peer);
    if (room?.isHost(peer)) room.close();
  }

  private forget(room: Room): void {
    this.rooms.delete(room.code);
    for (const [peer, bound] of this.bindings) {
      if (bound === room) this.bindings.delete(peer);
    }
  }

  private uniqueCode(): string {
    for (;;) {
      const code = makeRoomCode();
      if (!this.rooms.has(code)) return code;
    }
  }
}
