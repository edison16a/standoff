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
 * instances can share them. Without one, everything stays in this process.
 * That is the normal setup, on a laptop and on Vercel alike: a WebSocket
 * stays on the instance that took it, and a room is lost only when Vercel
 * adds an instance or a deploy lands, which the host notices and recovers
 * from (see RoomWatchdog).
 *
 * The result is cached so every socket a Vercel instance holds shares one
 * pair of Redis connections instead of opening two each.
 */
export function createBackend(): Promise<Backend> {
  const cached = holder[SHARED];
  if (cached) return cached;
  const attempt = open().catch((error: unknown) => {
    // Let the next socket try again rather than caching a failure forever.
    holder[SHARED] = null;
    throw error;
  });
  // Callers that need the backend still see the failure. This only stops a
  // failure nobody was waiting on, like a landing page socket's, from
  // counting as unhandled, which would take the whole Vercel instance down.
  attempt.catch(() => undefined);
  holder[SHARED] = attempt;
  return attempt;
}

async function open(): Promise<Backend> {
  const redisUrl = findRedisUrl();
  if (redisUrl) {
    const { createRedisBackend } = await import("./redis/redis-backend");
    return createRedisBackend(redisUrl);
  }
  return { store: new MemoryStore(), bus: new MemoryBus(), label: "memory (this process only)", shared: false };
}

type Env = Record<string, string | undefined>;
const REDIS_URL = /^rediss?:\/\//;

/**
 * Only the three usual names, and only a redis:// URL. Anything else, like
 * a leftover Marketplace variable under another name, keeps rooms in
 * memory, so a project never moves to Redis without someone meaning it.
 */
export function findRedisUrl(env: Env = process.env): string | null {
  const candidates = [env.REDIS_URL, env.KV_URL, env.UPSTASH_REDIS_URL];
  return candidates.find((value) => value !== undefined && REDIS_URL.test(value)) ?? null;
}

/**
 * True when every server instance sees the same rooms. A laptop runs one
 * process, so its memory counts. On Vercel only Redis does.
 */
export function sharedStore(env: Env = process.env): boolean {
  return !env.VERCEL || findRedisUrl(env) !== null;
}

/**
 * A backend that can be handed to a socket right away while the real one
 * is still connecting. Vercel's upgrade handler has to attach its listeners
 * before any await, or the client's first message can be lost, so the
 * socket gets this and every call waits for the connection underneath.
 *
 * It asks for the backend on every call rather than holding one promise,
 * so a socket that opened while Redis was down works once Redis is back.
 */
export function deferredBackend(get: () => Promise<Backend>): Backend {
  const store: RoomStore = {
    create: async (room) => (await get()).store.create(room),
    get: async (code) => (await get()).store.get(code),
    update: async (code, change) => (await get()).store.update(code, change),
    delete: async (code) => (await get()).store.delete(code),
    bump: async (key) => (await get()).store.bump(key),
  };
  return {
    store,
    bus: {
      publish: async (channel, message) => (await get()).bus.publish(channel, message),
      subscribe: async (channel, onMessage) => (await get()).bus.subscribe(channel, onMessage),
    },
    label: "deferred",
    shared: true,
  };
}
