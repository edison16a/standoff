import type { Bus } from "../backend";

/**
 * Pub/sub inside one process. Delivery is deferred to a microtask so it
 * behaves like a network bus: a publisher never runs subscriber code in
 * the middle of its own call.
 */
export class MemoryBus implements Bus {
  private readonly channels = new Map<string, Set<(message: string) => void>>();

  async publish(channel: string, message: string): Promise<void> {
    const handlers = this.channels.get(channel);
    if (!handlers) return;
    for (const handler of [...handlers]) queueMicrotask(() => handler(message));
  }

  async subscribe(channel: string, onMessage: (message: string) => void): Promise<() => Promise<void>> {
    const handlers = this.channels.get(channel) ?? new Set();
    handlers.add(onMessage);
    this.channels.set(channel, handlers);
    return async () => {
      handlers.delete(onMessage);
      if (handlers.size === 0) this.channels.delete(channel);
    };
  }
}
