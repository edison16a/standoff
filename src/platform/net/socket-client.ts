import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { Backoff } from "./backoff";
import { FINAL, HANDSHAKES, Handover } from "./handover";
import { closeIfStuck, lossyKey, OPEN, openChannel, readEnvelope, type Channel } from "./open-channel";
import type { SocketHandlers, SocketOptions } from "./socket-types";
import { StreamChannel } from "./stream-channel";
import { preferStream, TransportTally } from "./transport-choice";

export type { SocketHandlers, SocketStatus } from "./socket-types";

/** This much still waiting to go out means the network is behind, so motion frames are dropped. */
const CONGESTED_BYTES = 8 * 1024;
/** Close code the relay uses when a newer socket took this one's seat. */
const REPLACED = 4000;

/**
 * A WebSocket that keeps itself connected, with backoff, since phones lock
 * and walk out of range all the time. Before the server cuts a socket
 * (Vercel's time limit) a second one (`next`) opens and announces itself.
 * Sends switch to it once open and receives once it confirms the seat, so
 * the match never sees a disconnect. Each connection's transport is up to
 * transport-choice: a WebSocket unless those are blocked here.
 */
export class SocketClient {
  private current: Channel | null = null;
  private next: Channel | null = null;
  /** Always the stream, for a test or a page that asked for it. */
  private readonly forceStream: boolean;
  private readonly handover = new Handover();
  private readonly backoff = new Backoff();
  private readonly tally = new TransportTally();
  private stopped = false;

  constructor(
    private readonly handlers: SocketHandlers,
    options: SocketOptions = {},
  ) {
    this.forceStream = options.stream === true;
  }

  /** True while this client talks over the HTTP stream. */
  get usesStream(): boolean {
    return this.current instanceof StreamChannel;
  }

  connect(): void {
    // Already connected or reconnecting: a second socket would fight the first for the seat.
    if (!this.stopped && this.current) return;
    this.stopped = false;
    this.current = this.dial();
    this.handlers.onStatus("connecting");
  }

  send(message: ClientEnvelope, key?: string): void {
    const target = this.target();
    if (target?.readyState !== OPEN) return;
    const data = JSON.stringify(message);
    if (target instanceof StreamChannel) target.send(data, key);
    else target.send(data);
    if (target === this.next) this.handover.record(data);
  }

  /** Sends only if the link is keeping up. For high rate, replaceable data. */
  sendLossy(message: ClientEnvelope): void {
    if ((this.target()?.bufferedAmount ?? 0) <= CONGESTED_BYTES) this.send(message, lossyKey(message));
  }

  /** Outgoing messages switch to the new socket as soon as it is open. */
  private target(): Channel | null {
    return this.next?.readyState === OPEN ? this.next : this.current;
  }

  /** Drops the current socket and dials a fresh one at once, maybe on another server instance. */
  redial(): void {
    if (this.stopped) return;
    this.backoff.cancel();
    this.backoff.shorten();
    const old = this.current;
    this.abandonNext();
    this.current = this.dial();
    old?.close(1000);
  }

  /** A handover now, as for a server rotate. It lands where new connections go, as joining phones do. */
  rotateNow(): boolean {
    if (this.stopped || this.next || this.current?.readyState !== OPEN) return false;
    this.handover.rotating();
    this.next = this.dial();
    return true;
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

  private dial(stream = this.forceStream || preferStream(), standingIn = false): Channel {
    const channel = openChannel(stream);
    const stopWatch = closeIfStuck(channel);
    let opened = false;
    channel.onopen = () => {
      stopWatch();
      opened = true;
      this.tally.opened(stream, standingIn);
      this.onOpen(channel);
    };
    channel.onmessage = (event: MessageEvent<string>) => this.onMessage(channel, event.data);
    channel.onclose = (event: CloseEvent) => {
      stopWatch();
      const wanted = (channel === this.current || channel === this.next) && !this.stopped;
      this.onClose(channel, event.code, opened, this.tally.closed(stream, opened, wanted));
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
    this.handlers.onOpen((message) => socket.readyState === OPEN && socket.send(JSON.stringify(message)), { handover });
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
      this.promote(socket, message);
    }
    if (socket !== this.current) return;
    if (message.type === "server:rotate") return void this.rotateNow();
    this.handlers.onMessage(message);
  }

  /** Refused, maybe where the room is not known. The old socket works till its cut, so it is tried again. */
  private refusedHandover(): void {
    this.abandonNext();
    // Retried first: inside the optional call it would never run for a page with no handler.
    const retrying = this.retryHandover();
    this.handlers.onHandoverFailed?.({ final: !retrying });
  }

  private retryHandover(): boolean {
    return this.handover.retryLater(() => {
      if (!this.stopped && !this.next && this.current?.readyState === OPEN) this.next = this.dial();
    });
  }

  private onClose(socket: Channel, code: number, opened: boolean, standIn: boolean): void {
    if (socket === this.next) {
      this.next = null;
      this.resendUnconfirmed();
      if (standIn) this.next = this.dial(true, true);
      // A handover that never connected is tried again while the old socket lasts.
      else if (!opened && !this.stopped) this.retryHandover();
      return;
    }
    if (socket !== this.current || this.stopped) return;
    // Cut, or kicked for the new socket, before that one confirmed: carry on with it.
    if (this.next) return this.takeOver(this.next);
    // The seat moved to a newer socket, most likely this page in a second tab,
    // unless our own dead handover did it. Reconnecting would start a tug of war.
    if (code === REPLACED && !this.handover.causedKick()) {
      this.current = null;
      return this.handlers.onStatus("replaced");
    }
    // A WebSocket that will not open here is no outage: the stream goes at once.
    if (standIn) return void (this.current = this.dial(true, true));
    this.backoff.schedule(() => (this.current = this.dial()));
    this.handlers.onStatus(this.backoff.unreachable ? "unreachable" : "reconnecting");
  }

  /** The new socket holds the seat now. The old one gets a last word to its instance, then goes. */
  private promote(socket: Channel, confirmation: ServerEnvelope): void {
    const old = this.current;
    this.takeOver(socket);
    this.handlers.onHandedOver?.(confirmation, (message) => old?.readyState === OPEN && old.send(JSON.stringify(message)));
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
