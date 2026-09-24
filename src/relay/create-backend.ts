import type { Backend } from "./backend";
import { MemoryBus } from "./memory/memory-bus";
import { MemoryStore } from "./memory/memory-store";

/**
 * Picks where rooms live. With a Redis URL in the environment, rooms and
 * messages go through Redis so any number of server instances can share
 * them, which is what Vercel needs. Without one, everything stays in this
 * process, which is all a single laptop on a LAN needs.
 */
export async function createBackend(): Promise<Backend> {
  const redisUrl = findRedisUrl();
  if (redisUrl) {
    const { createRedisBackend } = await import("./redis/redis-backend");
    return createRedisBackend(redisUrl);
  }
  return { store: new MemoryStore(), bus: new MemoryBus(), label: "memory (this process only)" };
}

/** Marketplace integrations name the variable differently, so check the usual ones. */
export function findRedisUrl(): string | null {
  const candidates = [process.env.REDIS_URL, process.env.KV_URL, process.env.UPSTASH_REDIS_URL];
  return candidates.find((value) => value && /^rediss?:\/\//.test(value)) ?? null;
}
