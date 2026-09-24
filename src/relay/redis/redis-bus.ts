import type { Redis } from "ioredis";
import type { Bus } from "../backend";

/**
 * Redis pub/sub. A connection in subscriber mode cannot run other
 * commands, so there are two: the shared client publishes, and one
 * dedicated connection per server instance holds every subscription,
 * fanning messages out to the sockets in this instance that want them.
 */
interface Subscription {
  handlers: Set<(message: string) => void>;
  /** Settles when Redis has confirmed the SUBSCRIBE. */
  ready: Promise<unknown>;
}

export class RedisBus implements Bus {
  private readonly channels = new Map<string, Subscription>();

  constructor(
    private readonly publisher: Redis,
    private readonly subscriber: Redis,
  ) {
    subscriber.on("message", (channel: string, message: string) => {
      for (const handler of this.channels.get(channel)?.handlers ?? []) handler(message);
    });
  }

  /** Redis counts subscribed connections, which here means server instances listening. */
  async publish(channel: string, message: string): Promise<number> {
    return this.publisher.publish(channel, message);
  }

  /**
   * Everyone subscribing to a channel waits on the same SUBSCRIBE. If it
   * fails, the entry goes, so the next caller sends a fresh one instead of
   * finding a channel that looks live but never hears anything.
   */
  async subscribe(channel: string, onMessage: (message: string) => void): Promise<() => Promise<void>> {
    let entry = this.channels.get(channel);
    if (!entry) {
      entry = { handlers: new Set(), ready: this.subscriber.subscribe(channel) };
      this.channels.set(channel, entry);
    }
    const subscription = entry;
    try {
      await subscription.ready;
    } catch (error) {
      if (this.channels.get(channel) === subscription) this.channels.delete(channel);
      throw error;
    }
    subscription.handlers.add(onMessage);
    return async () => {
      subscription.handlers.delete(onMessage);
      if (subscription.handlers.size > 0 || this.channels.get(channel) !== subscription) return;
      this.channels.delete(channel);
      await this.subscriber.unsubscribe(channel);
    };
  }
}
