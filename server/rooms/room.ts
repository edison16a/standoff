import type { Slot } from "../../src/shared/players";
import type { HostMessage, PhoneMessage, ServerEnvelope } from "../../src/shared/protocol";
import type { Peer } from "./peer";
import { makeToken } from "./room-code";

/** How long a room waits for its host to come back after a reload. */
export const HOST_GRACE_MS = 30_000;
/** How long a phone keeps its seat after dropping off the network. */
export const SEAT_GRACE_MS = 60_000;

interface Seat {
  token: string;
  peer: Peer | null;
  /** Frees the seat if the phone never comes back. */
  expiry: ReturnType<typeof setTimeout> | null;
}

export type JoinResult = { ok: true; slot: Slot; token: string; rejoined: boolean } | { ok: false; reason: "full" };

/**
 * One game: a host and up to two phones. The room only routes messages
 * and tracks who holds which seat. All game rules run on the host, which
 * acts as the referee.
 */
export class Room {
  readonly hostToken = makeToken();
  private host: Peer | null;
  private hostExpiry: ReturnType<typeof setTimeout> | null = null;
  private readonly seats: Record<Slot, Seat | null> = { 1: null, 2: null };
  private closed = false;

  constructor(
    readonly code: string,
    host: Peer,
    readonly joinUrl: string,
    /** Called once when the room shuts for good so the registry can forget it. */
    private readonly onClose: (room: Room) => void,
  ) {
    this.host = host;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  isHost(peer: Peer): boolean {
    return peer === this.host;
  }

  connectedSlots(): [boolean, boolean] {
    return [Boolean(this.seats[1]?.peer), Boolean(this.seats[2]?.peer)];
  }

  /** A reloaded host tab proves it owns the room with the token. */
  resumeHost(peer: Peer, token: string): boolean {
    if (this.closed || token !== this.hostToken) return false;
    this.clearHostExpiry();
    this.host?.close();
    this.host = peer;
    this.broadcastToPhones({ type: "host:back" });
    return true;
  }

  /**
   * Seats a phone. A known token gets its old seat back. Otherwise the
   * phone takes the lowest free seat, which is how join order decides who
   * is player one.
   */
  joinPhone(peer: Peer, token?: string): JoinResult {
    const known = token ? this.findSlotByToken(token) : null;
    if (known) {
      const seat = this.seats[known]!;
      if (seat.expiry) clearTimeout(seat.expiry);
      seat.expiry = null;
      seat.peer?.close();
      seat.peer = peer;
      this.host?.send({ type: "peer:joined", slot: known, rejoined: true });
      return { ok: true, slot: known, token: seat.token, rejoined: true };
    }
    const free = ([1, 2] as const).find((slot) => this.seats[slot] === null);
    if (!free) return { ok: false, reason: "full" };
    const seat: Seat = { token: makeToken(), peer, expiry: null };
    this.seats[free] = seat;
    this.host?.send({ type: "peer:joined", slot: free, rejoined: false });
    return { ok: true, slot: free, token: seat.token, rejoined: false };
  }

  /** Called when any socket in this room goes away. */
  detach(peer: Peer): void {
    if (this.closed) return;
    if (peer === this.host) {
      this.host = null;
      this.broadcastToPhones({ type: "host:away" });
      this.hostExpiry = setTimeout(() => this.close(), HOST_GRACE_MS);
      return;
    }
    const slot = this.slotOf(peer);
    if (!slot) return;
    const seat = this.seats[slot]!;
    seat.peer = null;
    this.host?.send({ type: "peer:left", slot });
    seat.expiry = setTimeout(() => {
      this.seats[slot] = null;
    }, SEAT_GRACE_MS);
  }

  fromHost(peer: Peer, to: Slot | "all", payload: HostMessage): void {
    if (peer !== this.host) return;
    const message: ServerEnvelope = { type: "host:message", payload };
    if (to === "all") this.broadcastToPhones(message);
    else this.seats[to]?.peer?.send(message);
  }

  fromPhone(peer: Peer, payload: PhoneMessage): void {
    const slot = this.slotOf(peer);
    if (slot) this.host?.send({ type: "peer:message", slot, payload });
  }

  /** Shuts the room and tells every phone still connected. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.clearHostExpiry();
    for (const slot of [1, 2] as const) {
      const seat = this.seats[slot];
      if (seat?.expiry) clearTimeout(seat.expiry);
      seat?.peer?.send({ type: "room:closed" });
    }
    this.onClose(this);
  }

  private slotOf(peer: Peer): Slot | null {
    if (this.seats[1]?.peer === peer) return 1;
    if (this.seats[2]?.peer === peer) return 2;
    return null;
  }

  private findSlotByToken(token: string): Slot | null {
    if (this.seats[1]?.token === token) return 1;
    if (this.seats[2]?.token === token) return 2;
    return null;
  }

  private broadcastToPhones(message: ServerEnvelope): void {
    this.seats[1]?.peer?.send(message);
    this.seats[2]?.peer?.send(message);
  }

  private clearHostExpiry(): void {
    if (this.hostExpiry) clearTimeout(this.hostExpiry);
    this.hostExpiry = null;
  }
}
