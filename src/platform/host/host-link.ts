import { SocketClient, type SocketHandlers, type SocketStatus } from "@/platform/net/socket-client";
import type { HandoverFailure, OpenInfo } from "@/platform/net/socket-types";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";

/** How long an old room's socket stays after a swap, for its retire to be confirmed. */
const OLD_SOCKET_MS = 3000;

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

  /** Quiets an old socket and closes it once its retire is confirmed, or after a few seconds. */
  retireOld(old: LinkPart): void {
    const { client } = old;
    this.retiring.add(client);
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      this.retiring.delete(client);
      client.close();
    };
    const timer = setTimeout(close, OLD_SOCKET_MS);
    old.handlers.target = {
      onOpen: () => undefined,
      onMessage: (message) => {
        if (message.type !== "room:retired") return;
        this.handlers.onMessage(message);
        close();
      },
      // Kicked, cut or reconnecting: it has nothing left to do.
      onStatus: (status) => {
        if (status !== "open") close();
      },
    };
  }

  close(): void {
    this.part.client.close();
    for (const client of [...this.retiring]) client.close();
    this.retiring.clear();
  }
}
