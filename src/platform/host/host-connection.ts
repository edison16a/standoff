import type { ProbeOutcome } from "@/platform/net/room-probe";
import type { SocketStatus } from "@/platform/net/socket-client";
import type { HandoverFailure } from "@/platform/net/socket-types";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { HostLink } from "./host-link";
import { HostProbe } from "./host-probe";
import type { RoomCandidate } from "./room-candidate";
import { RoomKeeper, type OpenedRoom, type RoomKeeperEvents } from "./room-keeper";
import { sessionMemory, type RememberedRoom } from "./room-memory";
import { RoomMover } from "./room-mover";

export interface ConnectionEvents {
  room: RoomKeeperEvents;
  /** Everything that is not about the room itself: phones, mostly. */
  message(message: ServerEnvelope): void;
  status(status: SocketStatus): void;
  handoverFailed(info: HandoverFailure): void;
  /** Each seat's name, null where nobody sat, to make the room again elsewhere. */
  names(): (string | null)[];
  /** Every server instance sees the same rooms. */
  shared(): boolean;
}

/**
 * The host's connection and the room it holds: the socket, which a remade
 * room's fresh one can replace, the keeper that resumes the room on every
 * new socket, the host's own room checks, and the mover that keeps the room
 * where new connections go.
 */
export class HostConnection {
  private readonly link: HostLink;
  private keeper: RoomKeeper;
  private readonly probe = new HostProbe();
  readonly mover: RoomMover;

  constructor(private readonly events: ConnectionEvents) {
    this.link = new HostLink({
      onOpen: (send, info) => this.keeper.announce(send, info),
      onMessage: (message) => this.onMessage(message),
      onStatus: (status) => events.status(status),
      onHandoverFailed: (info) => events.handoverFailed(info),
      onHandedOver: (confirmation, sendOld) => this.mover.handedOver(confirmation, this.keeper.instance, this.token, sendOld),
    });
    const keeperLink = { send: (message: ClientEnvelope) => this.link.send(message), redial: () => this.link.redial(), usesStream: () => this.link.usesStream };
    this.keeper = new RoomKeeper(sessionMemory, keeperLink, events.room);
    this.keeper.names = () => events.names();
    this.mover = new RoomMover({ rotate: () => this.link.rotateNow(), shared: () => events.shared(), now: Date.now });
  }

  /** The room this tab holds, from before a reload too. */
  get remembered(): RememberedRoom | null {
    return this.keeper.memory.recall();
  }

  get token(): string {
    return this.remembered?.token ?? "";
  }

  connect(): void {
    this.link.connect();
  }

  close(): void {
    this.mover.stop();
    this.keeper.dispose();
    this.link.close();
  }

  send(message: ClientEnvelope): void {
    this.link.send(message);
  }

  create(game: string, seats: number): boolean {
    return this.keeper.create(game, seats);
  }

  /** Ends the room for everyone, sent again until the relay confirms, and forgets it. */
  leave(): void {
    const room = this.remembered;
    if (room) this.keeper.retire(room);
    this.keeper.forget();
    this.mover.stop();
  }

  /** Checks the room the way a phone reaches it, over the transport this page's own socket uses. */
  check(code: string): Promise<ProbeOutcome> {
    return this.probe.check({ code, token: this.token }, this.link.usesStream);
  }

  /** A new room passed its check: its socket and keeper become the host's, and the old room sends its phones on. */
  swap(candidate: RoomCandidate, room: OpenedRoom, old: RememberedRoom): void {
    // Where the old room lives, to tell a real "not found" from one on another instance.
    const from = this.keeper.instance;
    const previous = this.link.adopt(candidate.handOver());
    this.keeper.dispose();
    this.keeper = candidate.keeper;
    this.keeper.memory = sessionMemory;
    this.keeper.events = this.events.room;
    this.keeper.names = () => this.events.names();
    this.keeper.adopt(room);
    // Through the new socket, and through the old one, which sits where the old room lives.
    this.keeper.retire(old, room.code, from);
    const retire = old.token ? { type: "host:retire" as const, code: old.code, token: old.token, movedTo: room.code } : null;
    this.link.retireOld(previous, retire, { instance: from, shared: this.keeper.shared });
  }

  private onMessage(message: ServerEnvelope): void {
    switch (message.type) {
      case "room:created":
      case "room:resumed":
      case "room:error":
      case "room:retired":
        return this.keeper.handle(message);
      case "room:probe":
        this.probe.answer(message.nonce);
        return this.link.send({ type: "host:echo", nonce: message.nonce });
      default:
        return this.events.message(message);
    }
  }
}
