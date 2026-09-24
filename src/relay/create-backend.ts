import type { Backend, RoomStore } from "./backend";
import { MemoryBus } from "./memory/memory-bus";
import { MemoryStore } from "./memory/memory-store";

/**
 * Kept on the global object, not in a module variable. Locally the custom
 * server and Next's route handlers load this file as two separate module
 * copies in the same process, and they must still see the same rooms.
 */
const SHARED = Symbol.for("standoff.backend");
const holder = globalThis as { [SHARED]?: Promise<Backend> | null };

/**
 * Picks where rooms live, once per process. With a Redis URL in the
 * environment, rooms and messages go through Redis so any number of server
 * instances can share them, which is what Vercel needs. Without one,
 * everything stays in this process, which is all a laptop on a LAN needs.
 *
 * The result is cached so every socket a Vercel instance holds shares one
 * pair of Redis connections instead of opening two each.
 */
export function createBackend(): Promise<Backend> {
  holder[SHARED] ??= open().catch((error: unknown) => {
    // Let the next socket try again rather than caching a failure forever.
    holder[SHARED] = null;
    throw error;
  });
  return holder[SHARED];
}

async function open(): Promise<Backend> {
  const redisUrl = findRedisUrl();
  if (redisUrl) {
    const { createRedisBackend } = await import("./redis/redis-backend");
    return createRedisBackend(redisUrl);
  }
  return { store: new MemoryStore(), bus: new MemoryBus(), label: "memory (this process only)", shared: false };
}

/** Marketplace integrations name the variable differently, so check the usual ones. */
export function findRedisUrl(): string | null {
  const candidates = [process.env.REDIS_URL, process.env.KV_URL, process.env.UPSTASH_REDIS_URL];
  return candidates.find((value) => value && /^rediss?:\/\//.test(value)) ?? null;
}

/**
 * A backend that can be handed to a socket right away while the real one
 * is still connecting. Vercel's upgrade handler has to attach its listeners
 * before any await, or the client's first message can be lost, so the
 * socket gets this and every call waits for the connection underneath.
 */
export function deferredBackend(pending: Promise<Backend>): Backend {
  const store: RoomStore = {
    create: async (room) => (await pending).store.create(room),
    get: async (code) => (await pending).store.get(code),
    update: async (code, change) => (await pending).store.update(code, change),
    delete: async (code) => (await pending).store.delete(code),
  };
  return {
    store,
    bus: {
      publish: async (channel, message) => (await pending).bus.publish(channel, message),
      subscribe: async (channel, onMessage) => (await pending).bus.subscribe(channel, onMessage),
    },
    label: "deferred",
    shared: true,
  };
}
