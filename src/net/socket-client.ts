import { SOCKET_PATH, type ClientEnvelope, type ServerEnvelope } from "@/shared/protocol";

export type SocketStatus = "connecting" | "open" | "reconnecting" | "unreachable" | "replaced" | "closed";

type Send = (message: ClientEnvelope) => void;

export interface SocketHandlers {
  /**
   * Runs on every new socket, which is where a client announces itself
   * (join, or resume with its token). `send` goes to that new socket.
   */
  onOpen(send: Send): void;
  onMessage(message: ServerEnvelope): void;
  onStatus(status: SocketStatus): void;
}

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
 */
export class SocketClient {
  private current: WebSocket | null = null;
  private next: WebSocket | null = null;
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
    const target = this.next?.readyState === WebSocket.OPEN ? this.next : this.current;
    if (target?.readyState === WebSocket.OPEN) target.send(JSON.stringify(message));
  }

  /** Sends only if the link is keeping up. For high rate, replaceable data. */
  sendLossy(message: ClientEnvelope): void {
    const target = this.next ?? this.current;
    if (target && target.bufferedAmount > CONGESTED_BYTES) return;
    this.send(message);
  }

  close(): void {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry);
    this.current?.close(1000);
    this.next?.close(1000);
    this.current = this.next = null;
    this.handlers.onStatus("closed");
  }

  private dial(): WebSocket {
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${scheme}://${location.host}${SOCKET_PATH}`);
    socket.onopen = () => this.onOpen(socket);
    socket.onmessage = (event: MessageEvent<string>) => this.onMessage(socket, event.data);
    socket.onclose = (event: CloseEvent) => this.onClose(socket, event.code);
    return socket;
  }

  private onOpen(socket: WebSocket): void {
    if (socket === this.current) {
      this.failures = 0;
      this.backoff = MIN_BACKOFF_MS;
      this.handlers.onStatus("open");
    }
    this.handlers.onOpen((message) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    });
  }

  private onMessage(socket: WebSocket, raw: string): void {
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

  private onClose(socket: WebSocket, code: number): void {
    if (socket === this.next) {
      this.next = null;
      return;
    }
    if (socket !== this.current || this.stopped) return;
    // A handover is under way: the old socket was cut (or kicked by the
    // relay for the new one) before the new one confirmed. Carry on with it.
    if (this.next) {
      this.current = this.next;
      this.next = null;
      return;
    }
    // The seat moved to a newer socket, most likely this page open in a
    // second tab. Reconnecting would only take it back and start a tug of war.
    if (code === REPLACED) {
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
  private promote(socket: WebSocket): void {
    const old = this.current;
    this.current = socket;
    this.next = null;
    old?.close(1000);
  }

  private abandonNext(): void {
    const next = this.next;
    this.next = null;
    next?.close(1000);
  }
}
