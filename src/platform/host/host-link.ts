import { SocketClient, type SocketHandlers, type SocketStatus } from "@/platform/net/socket-client";
import type { HandoverFailure, OpenInfo } from "@/platform/net/socket-types";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { settles, type Retire, type RetireWhere } from "./retire-queue";

/** How long an old socket stays after a swap with nothing to retire. */
const OLD_SOCKET_MS = 3000;
/** How long it keeps sending its room's retire, and how often. */
const OLD_RETIRE_MS = 20_000;
const OLD_RESEND_MS = 2000;

/**
 * Socket handlers that can be pointed somewhere else. A socket built for a
 * room being checked (see RoomCandidate) goes on to serve the host once the
 * room passes, without a reconnect.
 */
export class HandlerSwitch implements SocketHandlers {
  /** The socket's latest status, so whoever it is pointed at next hears where it stands. */
  status: SocketStatus = "connecting";
  constructor(public target: SocketHandlers) {}
  onOpen(send: (message: ClientEnvelope) => void, info: OpenInfo): void {
    this.target.onOpen(send, info);
  }
  onMessage(message: ServerEnvelope): void {
    this.target.onMessage(message);
  }
  onStatus(status: SocketStatus): void {
    this.status = status;
    this.target.onStatus(status);
  }
  onHandoverFailed(info: HandoverFailure): void {
    this.target.onHandoverFailed?.(info);
  }
  onHandedOver(confirmation: ServerEnvelope, sendOld: (message: ClientEnvelope) => void): void {
    this.target.onHandedOver?.(confirmation, sendOld);
  }
}

export interface LinkPart {
  client: SocketClient;
  handlers: HandlerSwitch;
}

/**
 * The host's connection, which can be swapped for a fresh one. After a
 * swap the old socket hears nothing but the confirmation of its room's
 * retire, and closes soon after, so its kick or its reconnects never
 * reach the host.
 */
export class HostLink {
  private part: LinkPart;
  private readonly retiring = new Set<SocketClient>();

  constructor(
    private readonly handlers: SocketHandlers,
    make: (handlers: HandlerSwitch) => SocketClient = (switched) => new SocketClient(switched),
  ) {
    const switched = new HandlerSwitch(handlers);
    this.part = { client: make(switched), handlers: switched };
  }

  get usesStream(): boolean {
    return this.part.client.usesStream;
  }

  connect(): void {
    this.part.client.connect();
  }

  send(message: ClientEnvelope): void {
    this.part.client.send(message);
  }

  redial(): void {
    this.part.client.redial();
  }

  /** Moves to a fresh socket now, keeping the old one till it confirms (see SocketClient). */
  rotateNow(): boolean {
    return this.part.client.rotateNow();
  }

  /**
   * Makes a checked socket the host's own. Its status is passed on, since
   * the host may still hold the old socket's, like "reconnecting", which
   * would hide the new room's code and keep Host Game locked after leaving.
   * Returns the old one, to retire.
   */
  adopt(next: LinkPart): LinkPart {
    const old = this.part;
    next.handlers.target = this.handlers;
    this.part = next;
    this.handlers.onStatus(next.handlers.status);
    return old;
  }

  /**
   * Quiets an old socket and has it end its room: the retire goes out now,
   * again on a beat and on every reconnect, since the old socket sits
   * where the old room lives and a lost post once stranded its phones. It
   * closes once the room's own instance confirms, or when kicked, or after
   * a while.
   */
  retireOld(old: LinkPart, retire: Retire | null = null, where: RetireWhere = { instance: null, shared: true }): void {
    const { client } = old;
    this.retiring.add(client);
    let done = false;
    const say = () => retire && client.send(retire);
    const close = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearInterval(beat);
      this.retiring.delete(client);
      client.close();
    };
    const timer = setTimeout(close, retire ? OLD_RETIRE_MS : OLD_SOCKET_MS);
    const beat = setInterval(say, OLD_RESEND_MS);
    old.handlers.target = {
      onOpen: (send) => retire && send(retire),
      onMessage: (message) => {
        if (message.type !== "room:retired") return;
        this.handlers.onMessage(message);
        if (!retire || message.code !== retire.code || settles(message, where)) close();
      },
      // Kicked for the retire, or closed: it has nothing left to do. A reconnect may still reach the room.
      onStatus: (status) => {
        if (status === "replaced" || status === "closed" || (!retire && status !== "open")) close();
      },
    };
    say();
  }

  close(): void {
    this.part.client.close();
    for (const client of [...this.retiring]) client.close();
    this.retiring.clear();
  }
}
