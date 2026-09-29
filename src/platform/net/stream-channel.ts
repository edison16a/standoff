import { STREAM_PATH } from "@/platform/protocol";

const CONNECTING = 0;
const OPEN = 1;
const CLOSED = 3;
/** Close code for a channel that dropped without a word, as a WebSocket reports it. */
const ABNORMAL = 1006;
/** The server's answer when no instance it reached holds our stream. */
const GONE = 410;
/**
 * Without a shared store, a post can land on a server instance that does
 * not hold our stream, which answers 410. Each retry is routed afresh, so
 * one of a few usually finds the right one. They go at once: a pause would
 * only hold up everything queued behind.
 */
const MISROUTED_RETRIES = 5;
/**
 * Posts start at least this far apart, so a busy phone sends ten a second
 * at most. Every post is a request of its own, and a flood of them is what
 * makes Vercel add server instances, which splits rooms up.
 */
export const POST_GAP_MS = 100;

interface Queued {
  data: string;
  /** A later message with the same key replaces this one while it waits. */
  key?: string;
}

/**
 * The HTTP fallback for when a WebSocket will not open (see
 * app/api/stream). An event stream brings messages down. Messages going up
 * are batched into POSTs, one at a time so they arrive in order, and
 * spaced out, with whatever queued meanwhile riding in the next one.
 *
 * It copies the parts of the WebSocket interface the socket client uses,
 * events included, so the client handles both the same way.
 */
export class StreamChannel {
  readyState = CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  /** How many POSTs went out, for tests and the stress runs. */
  posts = 0;
  private readonly source = new EventSource(STREAM_PATH);
  private id = "";
  private queue: Queued[] = [];
  private sendingBytes = 0;
  private lastPost = -Infinity;
  private timer: ReturnType<typeof setTimeout> | null = null;

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
    return this.queue.reduce((sum, item) => sum + item.data.length, 0) + this.sendingBytes;
  }

  /**
   * Queues a message for the next POST. With a `key`, like a motion
   * frame's kind, only the newest of that key still waiting goes out.
   */
  send(data: string, key?: string): void {
    if (this.readyState !== OPEN) return;
    if (key !== undefined) this.queue = this.queue.filter((item) => item.key !== key);
    this.queue.push({ data, key });
    this.schedule();
  }

  close(code = 1000): void {
    this.finish(code);
  }

  /** Posts now if the last one is done and far enough back, or once it is. */
  private schedule(): void {
    if (this.sendingBytes > 0 || this.timer || this.queue.length === 0) return;
    const wait = this.lastPost + POST_GAP_MS - Date.now();
    if (wait <= 0) return void this.post();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.schedule();
    }, wait);
  }

  private async post(): Promise<void> {
    if (this.readyState !== OPEN) return;
    const body = `[${this.queue.map((item) => item.data).join(",")}]`;
    this.queue = [];
    this.sendingBytes = body.length;
    this.lastPost = Date.now();
    try {
      let status = GONE;
      for (let attempt = 0; status === GONE && attempt <= MISROUTED_RETRIES; attempt++) {
        this.posts += 1;
        status = (await fetch(`${STREAM_PATH}?s=${this.id}`, { method: "POST", body })).status;
      }
      // Still gone, or anything else unexpected: start over on a fresh channel.
      if (status >= 300) return this.finish(ABNORMAL);
    } catch {
      return this.finish(ABNORMAL);
    } finally {
      this.sendingBytes = 0;
    }
    this.schedule();
  }

  private finish(code: number): void {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    this.source.close();
    this.queue = [];
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.onclose?.(new CloseEvent("close", { code }));
  }
}
