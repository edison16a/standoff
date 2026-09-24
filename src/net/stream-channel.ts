import { STREAM_PATH } from "@/shared/protocol";

const CONNECTING = 0;
const OPEN = 1;
const CLOSED = 3;
/** Close code for a channel that dropped without a word, as a WebSocket reports it. */
const ABNORMAL = 1006;

/**
 * The HTTP fallback for when a WebSocket will not open, as on Chrome
 * against Vercel (see app/api/stream). An event stream brings messages
 * down. Messages going up are batched into POSTs, one request at a time
 * so they arrive in order, with whatever queued meanwhile riding in the
 * next one.
 *
 * It copies the parts of the WebSocket interface the socket client uses,
 * events included, so the client handles both the same way.
 */
export class StreamChannel {
  readyState = CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  private readonly source = new EventSource(STREAM_PATH);
  private id = "";
  private queue: string[] = [];
  private queuedBytes = 0;
  private sendingBytes = 0;

  constructor() {
    this.source.addEventListener("hello", (event: MessageEvent<string>) => {
      this.id = event.data;
      this.readyState = OPEN;
      this.onopen?.(new Event("open"));
    });
    this.source.onmessage = (event: MessageEvent<string>) => {
      if (this.readyState === OPEN) this.onmessage?.(new MessageEvent("message", { data: event.data }));
    };
    this.source.addEventListener("close", (event: MessageEvent<string>) => this.finish(Number(event.data) || 1000));
    // EventSource would quietly reconnect by itself. The socket client has
    // its own reconnect and handover rules, so any error ends this channel.
    this.source.onerror = () => this.finish(ABNORMAL);
  }

  /** Bytes not yet delivered, like a WebSocket's, so congestion checks work the same. */
  get bufferedAmount(): number {
    return this.queuedBytes + this.sendingBytes;
  }

  send(data: string): void {
    if (this.readyState !== OPEN) return;
    this.queue.push(data);
    this.queuedBytes += data.length;
    if (this.sendingBytes === 0) void this.flush();
  }

  close(code = 1000): void {
    this.finish(code);
  }

  private async flush(): Promise<void> {
    while (this.queue.length > 0 && this.readyState === OPEN) {
      const body = `[${this.queue.join(",")}]`;
      this.queue = [];
      this.queuedBytes = 0;
      this.sendingBytes = body.length;
      try {
        const response = await fetch(`${STREAM_PATH}?s=${this.id}`, { method: "POST", body });
        // 410 means the server no longer holds our stream. Anything else
        // unexpected is treated the same: start over on a fresh channel.
        if (!response.ok) return this.finish(ABNORMAL);
      } catch {
        return this.finish(ABNORMAL);
      } finally {
        this.sendingBytes = 0;
      }
    }
  }

  private finish(code: number): void {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    this.source.close();
    this.queue = [];
    this.queuedBytes = 0;
    this.onclose?.(new CloseEvent("close", { code }));
  }
}
