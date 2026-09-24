import type { Redis } from "ioredis";
import type { Bus } from "../backend";

/**
 * Redis pub/sub. A connection in subscriber mode cannot run other
 * commands, so there are two: the shared client publishes, and one
 * dedicated connection per server instance holds every subscription,
 * fanning messages out to the sockets in this instance that want them.
 */
export class RedisBus implements Bus {
  private readonly handlers = new Map<string, Set<(message: string) => void>>();

  constructor(
    private readonly publisher: Redis,
    private readonly subscriber: Redis,
  ) {
    subscriber.on("message", (channel: string, message: string) => {
      for (const handler of this.handlers.get(channel) ?? []) handler(message);
    });
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, onMessage: (message: string) => void): Promise<() => Promise<void>> {
    let set = this.handlers.get(channel);
    if (!set) {
      set = new Set();
      this.handlers.set(channel, set);
      await this.subscriber.subscribe(channel);
    }
    set.add(onMessage);
    return async () => {
      const current = this.handlers.get(channel);
      if (!current) return;
      current.delete(onMessage);
      if (current.size > 0) return;
      this.handlers.delete(channel);
      await this.subscriber.unsubscribe(channel);
    };
  }
}
