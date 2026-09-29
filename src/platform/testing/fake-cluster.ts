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
  /**
   * How a request picks its instance. `first` sends everything to the
   * newest instance, which is what Vercel does in runs: see `switch`.
   */
  routing: "roundRobin" | "random" | "first";
  /** False makes every WebSocket fail before it opens, as Chrome's do on Vercel. */
  webSockets?: boolean;
  /** Every instance shares one store and bus, as with Redis. */
  shared?: boolean;
  /** Sockets and streams are cut this long after they open, like Vercel's time limit, with a rotate first. */
  lifetimeMs?: number;
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
  /** Each deployment signs its room tokens with its own secret. */
  private secret = makeSecret();
  private readonly ids = new WeakMap<Backend, string>();
  private store: Backend | null = null;

  constructor(private readonly options: ClusterOptions) {
    this.backends = Array.from({ length: options.instances }, () => this.fresh());
  }

  /** A deploy: every connection drops, and the new deployment knows no room and signs differently. */
  deploy(): void {
    this.secret = makeSecret();
    this.backends = this.backends.map(() => this.fresh());
    for (const connection of [...this.live]) connection.drop();
  }

  /**
   * Vercel adds an instance and sends every new connection to it, while
   * the connections already open stay where they are until their cut.
   */
  switch(): void {
    this.backends = [this.fresh(), ...this.backends];
  }

  /** True if the instance new connections go to holds this room. */
  async newestHas(code: string): Promise<boolean> {
    return (await this.backends[0]!.store.get(code)) !== null;
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

  /** A new instance: rooms of its own, or with `shared` the one store every instance uses. */
  private fresh(): Backend {
    if (this.options.shared && this.store) return this.store;
    const backend = { store: new MemoryStore(), bus: new MemoryBus(), label: "instance", shared: false };
    this.ids.set(backend, Math.random().toString(36).slice(2, 10));
    if (this.options.shared) this.store = backend;
    return backend;
  }

  private context(backend: Backend): RelayContext {
    const { lifetimeMs, shared = false } = this.options;
    const deadline = lifetimeMs ? Date.now() + lifetimeMs : null;
    return { backend, joinUrlFor: (code) => `https://x/join/${code}`, now: Date.now, client: "test", sharedRooms: shared, deadline, secret: this.secret, instance: this.ids.get(backend) };
  }

  /** Cuts a connection at its deadline, as Vercel does. */
  private cutAt(context: RelayContext, cut: () => void): void {
    if (context.deadline !== null) setTimeout(cut, context.deadline - Date.now());
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
          const context = cluster.context(cluster.pick());
          this.relay = new RelayConnection({ send: (data) => this.deliver(data), close: (code) => this.shut(code ?? 1000) }, context);
          cluster.cutAt(context, () => this.shut(1006));
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
        const context = cluster.context(cluster.pick());
        cluster.cutAt(context, () => this.close());
        const reader = openEventStream(context, this.abort.signal).body!.getReader();
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

function makeSecret(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
