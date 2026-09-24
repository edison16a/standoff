import type { ClientEnvelope, ServerEnvelope } from "@/shared/protocol";
import { Handover } from "./handover";
import { OPEN, openChannel, streamRequested, type Channel } from "./open-channel";
import type { SocketHandlers } from "./socket-types";

export type { SocketHandlers, SocketStatus } from "./socket-types";

const MIN_BACKOFF_MS = 400;
const MAX_BACKOFF_MS = 4000;
/** After this many failed tries in a row the UI says the server cannot be reached. */
const UNREACHABLE_AFTER = 4;
/**
 * If this much is still waiting to go out, the network is behind. Motion
 * frames are dropped rather than queued, since a stale sword angle is
 * worse than a missing one.
 */
const CONGESTED_BYTES = 8 * 1024;
/** Close code the relay uses when a newer socket took this one's seat. */
const REPLACED = 4000;
/** The replies that mean a new socket has taken over the seat or the room. */
const HANDSHAKES = new Set<ServerEnvelope["type"]>(["phone:joined", "room:resumed", "room:created"]);

/**
 * A WebSocket that keeps itself connected. Phones lock, walk out of range
 * and come back, so reconnecting with backoff is the normal case here.
 *
 * It also moves itself to a fresh socket when the server asks. On Vercel
 * every socket is cut at the function's time limit, so the relay warns a
 * little early. A second socket (`next`) opens and announces itself.
 * Outgoing messages switch to it as soon as it is open, because the server
 * queues them behind the announce. Incoming ones switch once it confirms
 * the seat. Until then `current` keeps delivering, so nothing is lost or
 * doubled and the match never sees a disconnect.
 *
 * If a WebSocket fails before it ever opens, every channel after it is an
 * HTTP stream instead (see StreamChannel). That is what Chrome needs on
 * Vercel today, and it reaches the same relay.
 */
export class SocketClient {
  private current: Channel | null = null;
  private next: Channel | null = null;
  private useStream = streamRequested();
  private readonly handover = new Handover();
  private backoff = MIN_BACKOFF_MS;
  private failures = 0;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(private readonly handlers: SocketHandlers) {}

  connect(): void {
    this.stopped = false;
    this.current = this.dial();
    this.handlers.onStatus("connecting");
  }

  send(message: ClientEnvelope): void {
    const target = this.target();
    if (target?.readyState !== OPEN) return;
    const data = JSON.stringify(message);
    target.send(data);
    if (target === this.next) this.handover.record(data);
  }

  /** Sends only if the link is keeping up. For high rate, replaceable data. */
  sendLossy(message: ClientEnvelope): void {
    const target = this.target();
    if (target && target.bufferedAmount > CONGESTED_BYTES) return;
    this.send(message);
  }

  /** Outgoing messages switch to the new socket as soon as it is open. */
  private target(): Channel | null {
    return this.next?.readyState === OPEN ? this.next : this.current;
  }

  /**
   * Drops the current socket and dials a fresh one at once. Where rooms are
   * not shared between server instances, a fresh socket may well land on
   * the instance that has the room.
   */
  redial(): void {
    if (this.stopped) return;
    const old = this.current;
    this.abandonNext();
    this.current = this.dial();
    old?.close(1000);
  }

  close(): void {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry);
    this.current?.close(1000);
    this.next?.close(1000);
    this.current = this.next = null;
    this.handlers.onStatus("closed");
  }

  private dial(): Channel {
    const channel = openChannel(this.useStream);
    let opened = false;
    channel.onopen = () => {
      opened = true;
      this.onOpen(channel);
    };
    channel.onmessage = (event: MessageEvent<string>) => this.onMessage(channel, event.data);
    channel.onclose = (event: CloseEvent) => {
      if (!opened) this.useStream = true;
      this.onClose(channel, event.code);
    };
    return channel;
  }

  private onOpen(socket: Channel): void {
    if (socket === this.current) {
      this.failures = 0;
      this.backoff = MIN_BACKOFF_MS;
      this.handlers.onStatus("open");
    }
    if (socket === this.next) this.handover.announced();
    this.handlers.onOpen((message) => {
      if (socket.readyState === OPEN) socket.send(JSON.stringify(message));
    });
  }

  private onMessage(socket: Channel, raw: string): void {
    let message: ServerEnvelope;
    try {
      message = JSON.parse(raw) as ServerEnvelope;
    } catch {
      return;
    }
    if (socket === this.next) {
      // Until it confirms the seat, the new socket's traffic is also
      // arriving on the old one, so only the confirmation counts.
      if (!HANDSHAKES.has(message.type)) {
        if (message.type === "room:error") this.abandonNext();
        // Its own time will run out too, so move on again once it takes over.
        if (message.type === "server:rotate") this.handover.rotateAfter = true;
        return;
      }
      this.promote(socket);
    }
    if (socket !== this.current) return;
    if (message.type === "server:rotate") {
      if (!this.stopped && !this.next) this.next = this.dial();
      return;
    }
    this.handlers.onMessage(message);
  }

  private onClose(socket: Channel, code: number): void {
    if (socket === this.next) {
      this.next = null;
      this.resendUnconfirmed();
      return;
    }
    if (socket !== this.current || this.stopped) return;
    // A handover is under way: the old socket was cut (or kicked by the
    // relay for the new one) before the new one confirmed. Carry on with it.
    if (this.next) {
      this.takeOver(this.next);
      return;
    }
    // The seat moved to a newer socket, most likely this page open in a
    // second tab. Reconnecting would only take it back and start a tug of
    // war. Unless the newer socket was our own handover, which then died.
    if (code === REPLACED && !this.handover.causedKick()) {
      this.current = null;
      this.handlers.onStatus("replaced");
      return;
    }
    this.failures += 1;
    this.handlers.onStatus(this.failures >= UNREACHABLE_AFTER ? "unreachable" : "reconnecting");
    this.retry = setTimeout(() => {
      this.current = this.dial();
    }, this.backoff);
    this.backoff = Math.min(MAX_BACKOFF_MS, this.backoff * 2);
  }

  /** The new socket holds the seat now. The old one is retired quietly. */
  private promote(socket: Channel): void {
    const old = this.current;
    this.takeOver(socket);
    old?.close(1000);
  }

  private takeOver(socket: Channel): void {
    this.current = socket;
    this.next = null;
    if (this.handover.done() && !this.stopped) this.next = this.dial();
  }

  private abandonNext(): void {
    const next = this.next;
    this.next = null;
    next?.close(1000);
    this.resendUnconfirmed();
  }

  /** A handover that failed took some messages with it. The old socket still works. */
  private resendUnconfirmed(): void {
    const messages = this.handover.failed();
    if (this.current?.readyState === OPEN) for (const data of messages) this.current.send(data);
  }
}
