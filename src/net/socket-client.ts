import { SOCKET_PATH, type ClientEnvelope, type ServerEnvelope } from "@/shared/protocol";

export type SocketStatus = "connecting" | "open" | "reconnecting" | "closed";

export interface SocketHandlers {
  /** Runs on every (re)connect, which is where a client re-announces itself. */
  onOpen(): void;
  onMessage(message: ServerEnvelope): void;
  onStatus(status: SocketStatus): void;
}

const MIN_BACKOFF_MS = 400;
const MAX_BACKOFF_MS = 4000;
/**
 * If this much is still waiting to go out, the network is behind. Motion
 * frames are dropped rather than queued, since a stale sword angle is
 * worse than a missing one.
 */
const CONGESTED_BYTES = 8 * 1024;

/**
 * A WebSocket that keeps itself connected. Phones lock, walk out of range
 * and come back, so reconnecting with backoff is the normal case here, not
 * an error path. It talks to the same host and port the page came from,
 * over wss when the page is https.
 */
export class SocketClient {
  private socket: WebSocket | null = null;
  private backoff = MIN_BACKOFF_MS;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(private readonly handlers: SocketHandlers) {}

  connect(): void {
    this.stopped = false;
    this.open();
  }

  send(message: ClientEnvelope): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  /** Sends only if the link is keeping up. For high rate, replaceable data. */
  sendLossy(message: ClientEnvelope): void {
    if (this.socket && this.socket.bufferedAmount > CONGESTED_BYTES) return;
    this.send(message);
  }

  close(): void {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry);
    this.socket?.close(1000);
    this.socket = null;
    this.handlers.onStatus("closed");
  }

  private open(): void {
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${scheme}://${location.host}${SOCKET_PATH}`);
    this.socket = socket;
    this.handlers.onStatus(this.backoff === MIN_BACKOFF_MS ? "connecting" : "reconnecting");

    socket.onopen = () => {
      this.backoff = MIN_BACKOFF_MS;
      this.handlers.onStatus("open");
      this.handlers.onOpen();
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        this.handlers.onMessage(JSON.parse(event.data) as ServerEnvelope);
      } catch {
        // The server only sends JSON. Anything else is dropped.
      }
    };
    socket.onclose = () => {
      if (this.socket !== socket || this.stopped) return;
      this.handlers.onStatus("reconnecting");
      this.retry = setTimeout(() => this.open(), this.backoff);
      this.backoff = Math.min(MAX_BACKOFF_MS, this.backoff * 2);
    };
  }
}
