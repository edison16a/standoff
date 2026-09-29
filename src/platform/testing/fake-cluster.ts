import type { Backend } from "@/platform/relay/backend";
import { MemoryBus } from "@/platform/relay/memory/memory-bus";
import { MemoryStore } from "@/platform/relay/memory/memory-store";
import { parseEnvelope } from "@/platform/relay/parse-envelope";
import { RelayConnection, type RelayContext } from "@/platform/relay/relay-connection";
import { deliverBatch } from "@/platform/relay/stream/batch";
import { openEventStream } from "@/platform/relay/stream/event-stream";

export interface ClusterOptions {
  /** Server instances, each with rooms and a bus of its own, as on Vercel without a store. */
  instances: number;
  /** How a request picks its instance. */
  routing: "roundRobin" | "random" | "first";
  /** False makes every WebSocket fail before it opens, as Chrome's do on Vercel. */
  webSockets?: boolean;
}

type Listener = (event: { data: string }) => void;

/**
 * Several relay instances in one test, with the browser's WebSocket,
 * EventSource and fetch wired to them through a router. The real relay,
 * stream routes and clients run unchanged, so a test sees what a browser
 * would when Vercel spreads its requests over instances.
 */
export class FakeCluster {
  backends: Backend[];
  readonly counts = { sockets: 0, streams: 0, posts: 0, post410: 0, creates: 0 };
  private turn = 0;
  private readonly live = new Set<{ drop(): void }>();

  constructor(private readonly options: ClusterOptions) {
    this.backends = Array.from({ length: options.instances }, () => fresh());
  }

  /** A deploy or a recycled instance: every connection drops and every room is gone. */
  deploy(): void {
    this.backends = this.backends.map(() => fresh());
    for (const connection of [...this.live]) connection.drop();
  }

  /** The browser globals to stub. */
  globals() {
    return { WebSocket: this.socketClass(), EventSource: this.sourceClass(), fetch: (url: string, init: { body: string }) => this.post(url, init.body) };
  }

  private pick(): Backend {
    const { routing } = this.options;
    const index = routing === "first" ? 0 : routing === "random" ? Math.floor(Math.random() * this.backends.length) : this.turn++ % this.backends.length;
    return this.backends[index]!;
  }

  private context(backend: Backend): RelayContext {
    const shared = this.options.instances === 1;
    return { backend, joinUrlFor: (code) => `https://x/join/${code}`, now: Date.now, client: "test", sharedRooms: shared, deadline: null };
  }

  private async post(url: string, body: string): Promise<{ status: number }> {
    this.counts.posts += 1;
    this.counts.creates += (body.match(/"host:create"/g) ?? []).length;
    const status = await deliverBatch(this.pick().bus, new URL(url, "https://x").searchParams.get("s") ?? "", body);
    if (status === 410) this.counts.post410 += 1;
    return { status };
  }

  private socketClass() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the class below is the cluster's
    const cluster = this;
    return class ClusterSocket {
      readyState = 0;
      bufferedAmount = 0;
      onopen: (() => void) | null = null;
      onmessage: Listener | null = null;
      onclose: ((event: { code: number }) => void) | null = null;
      private relay: RelayConnection | null = null;
      /** Closed from this side: nothing more arrives. A server close still delivers what it sent first. */
      private hungUp = false;
      private readonly entry = { drop: () => this.shut(1006) };
      constructor() {
        cluster.counts.sockets += 1;
        cluster.live.add(this.entry);
        setTimeout(() => {
          if (this.readyState !== 0) return;
          if (cluster.options.webSockets === false) return this.shut(1006);
          this.relay = new RelayConnection({ send: (data) => this.deliver(data), close: (code) => this.shut(code ?? 1000) }, cluster.context(cluster.pick()));
          this.readyState = 1;
          this.onopen?.();
        });
      }
      send(data: string) {
        if (data.includes('"host:create"')) cluster.counts.creates += 1;
        const envelope = parseEnvelope(data);
        if (envelope && this.readyState === 1) this.relay?.receive(envelope);
      }
      close(code = 1000) {
        this.hungUp = true;
        this.shut(code);
      }
      private shut(code: number) {
        if (this.readyState === 3) return;
        this.readyState = 3;
        cluster.live.delete(this.entry);
        this.relay?.disconnect();
        setTimeout(() => this.onclose?.({ code }));
      }
      private deliver(data: string) {
        setTimeout(() => !this.hungUp && this.onmessage?.({ data }));
      }
    };
  }

  private sourceClass() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the class below is the cluster's
    const cluster = this;
    return class ClusterSource {
      onmessage: Listener | null = null;
      onerror: (() => void) | null = null;
      private readonly listeners = new Map<string, Listener>();
      private readonly abort = new AbortController();
      private readonly entry = { drop: () => this.close() };
      constructor() {
        cluster.counts.streams += 1;
        cluster.live.add(this.entry);
        setTimeout(() => void this.read());
      }
      addEventListener(type: string, listener: Listener) {
        this.listeners.set(type, listener);
      }
      close() {
        cluster.live.delete(this.entry);
        if (!this.abort.signal.aborted) {
          this.abort.abort();
          this.onerror?.();
        }
      }
      private async read() {
        const reader = openEventStream(cluster.context(cluster.pick()), this.abort.signal).body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
          buffer += decoder.decode(chunk.value, { stream: true });
          for (let at = buffer.indexOf("\n\n"); at >= 0; at = buffer.indexOf("\n\n")) {
            this.dispatch(buffer.slice(0, at));
            buffer = buffer.slice(at + 2);
          }
        }
        this.close();
      }
      private dispatch(block: string) {
        const type = /^event: (.*)$/m.exec(block)?.[1] ?? "message";
        const data = /^data: (.*)$/m.exec(block)?.[1];
        if (data === undefined) return;
        if (type === "message") this.onmessage?.({ data });
        else this.listeners.get(type)?.({ data });
      }
    };
  }
}

function fresh(): Backend {
  return { store: new MemoryStore(), bus: new MemoryBus(), label: "instance", shared: false };
}
