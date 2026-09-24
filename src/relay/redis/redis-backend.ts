import { Redis } from "ioredis";
import type { Backend } from "../backend";
import { RedisBus } from "./redis-bus";
import { RedisStore } from "./redis-store";

/**
 * Connects to Redis for rooms and messages. Commands fail fast instead of
 * queueing forever, so a Redis outage shows up as a join error rather than
 * a phone stuck on "Joining".
 */
export async function createRedisBackend(url: string): Promise<Backend> {
  const options = { maxRetriesPerRequest: 2, enableAutoPipelining: true, connectTimeout: 5000 };
  const client = new Redis(url, options);
  const subscriber = client.duplicate();
  // An "error" event with no listener throws. On Vercel an uncaught error
  // stops the whole instance, taking every socket on it down, when all
  // that happened was a Redis blip that ioredis would have retried.
  for (const connection of [client, subscriber]) {
    connection.on("error", (error: Error) => console.error("Redis connection error", error.message));
  }
  await Promise.all([ready(client), ready(subscriber)]);
  return {
    store: new RedisStore(client),
    bus: new RedisBus(client, subscriber),
    label: `Redis at ${new URL(url).hostname}`,
    shared: true,
    close: async () => {
      await Promise.all([client.quit(), subscriber.quit()]);
    },
  };
}

function ready(redis: Redis): Promise<void> {
  if (redis.status === "ready") return Promise.resolve();
  return new Promise((resolve, reject) => {
    redis.once("ready", () => resolve());
    redis.once("error", reject);
  });
}
