import type { ClientEnvelope } from "@/platform/protocol";
import { Backoff } from "./backoff";
import { FINAL, HANDSHAKES, Handover } from "./handover";
import { OPEN, openChannel, readEnvelope, streamRequested, type Channel } from "./open-channel";
import type { SocketHandlers, SocketOptions } from "./socket-types";

export type { SocketHandlers, SocketStatus } from "./socket-types";

/** This much still waiting to go out means the network is behind, so motion frames are dropped. */
const CONGESTED_BYTES = 8 * 1024;
/** Close code the relay uses when a newer socket took this one's seat. */
const REPLACED = 4000;

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
 * HTTP stream (see StreamChannel), as Chrome needs on Vercel today.
 */
export class SocketClient {
  private current: Channel | null = null;
  private next: Channel | null = null;
  private useStream: boolean;
  private readonly handover = new Handover();
  private readonly backoff = new Backoff();
  private stopped = false;

  constructor(
    private readonly handlers: SocketHandlers,
    options: SocketOptions = {},
  ) {
    this.useStream = options.stream === true || streamRequested();
  }

  /** True once this client talks over the HTTP stream, so helpers can use the same. */
  get usesStream(): boolean {
    return this.useStream;
  }

  connect(): void {
    // Already connected or reconnecting: a second socket would fight the first for the seat.
    if (!this.stopped && this.current) return;
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
    this.backoff.cancel();
    this.backoff.shorten();
    const old = this.current;
    this.abandonNext();
    this.current = this.dial();
    old?.close(1000);
  }

  close(): void {
    this.stopped = true;
    this.backoff.cancel();
    this.handover.stop();
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
      // Only a socket we still wanted counts against WebSockets. One we
      // closed ourselves while it was connecting, on a redial, says nothing.
      if (!opened && (channel === this.current || channel === this.next) && !this.stopped) this.useStream = true;
      this.onClose(channel, event.code);
    };
    return channel;
  }

  private onOpen(socket: Channel): void {
    if (socket === this.current) {
      this.backoff.reset();
      this.handlers.onStatus("open");
    }
    const handover = socket === this.next;
    if (handover) this.handover.announced();
    const send = (message: ClientEnvelope) => {
      if (socket.readyState === OPEN) socket.send(JSON.stringify(message));
    };
    this.handlers.onOpen(send, { handover });
  }

  private onMessage(socket: Channel, raw: string): void {
    const message = readEnvelope(raw);
    if (!message) return;
    if (socket === this.next) {
      if (FINAL.has(message.type)) return this.handlers.onMessage(message);
      // Until it confirms the seat, the new socket's traffic is also
      // arriving on the old one, so only the confirmation counts.
      if (!HANDSHAKES.has(message.type)) {
        if (message.type === "room:error") this.refusedHandover();
        // Its own time will run out too, so move on again once it takes over.
        if (message.type === "server:rotate") this.handover.rotateAfter = true;
        return;
      }
      this.promote(socket);
    }
    if (socket !== this.current) return;
    if (message.type === "server:rotate") {
      this.handover.rotating();
      if (!this.stopped && !this.next) this.next = this.dial();
      return;
    }
    this.handlers.onMessage(message);
  }

  /**
   * The new socket could not take over, maybe because it landed where the
   * room is not known. The old one still works until it is cut, so the
   * owner hears of it and the handover is tried again shortly.
   */
  private refusedHandover(): void {
    this.abandonNext();
    this.handlers.onHandoverFailed?.();
    this.handover.retryLater(() => {
      if (!this.stopped && !this.next && this.current?.readyState === OPEN) this.next = this.dial();
    });
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
    // The seat moved to a newer socket, most likely this page in a second
    // tab, unless it was our own handover that then died. Reconnecting
    // would only start a tug of war.
    if (code === REPLACED && !this.handover.causedKick()) {
      this.current = null;
      this.handlers.onStatus("replaced");
      return;
    }
    this.backoff.schedule(() => (this.current = this.dial()));
    this.handlers.onStatus(this.backoff.unreachable ? "unreachable" : "reconnecting");
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

