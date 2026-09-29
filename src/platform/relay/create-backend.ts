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
  warnUnshared();
  return { store: new MemoryStore(), bus: new MemoryBus(), label: "memory (this process only)", shared: false };
}

const KNOWN_NAMES = ["REDIS_URL", "KV_URL", "UPSTASH_REDIS_URL"];
type Env = Record<string, string | undefined>;
const REDIS_URL = /^rediss?:\/\//;

/**
 * Marketplace integrations name the variable differently, and some add a
 * prefix of their own (STORAGE_REDIS_URL), so the usual names come first
 * and then any variable ending the same way. REST URLs cannot be used.
 */
export function findRedisUrl(env: Env = process.env): string | null {
  for (const name of KNOWN_NAMES) if (REDIS_URL.test(env[name] ?? "")) return env[name]!;
  const other = Object.keys(env)
    .sort()
    .find((name) => /(REDIS_URL|KV_URL)$/.test(name) && REDIS_URL.test(env[name] ?? ""));
  return other ? env[other]! : null;
}

/**
 * True when every server instance sees the same rooms. A laptop runs one
 * process, so its memory counts. On Vercel only Redis does.
 */
export function sharedStore(env: Env = process.env): boolean {
  return !env.VERCEL || findRedisUrl(env) !== null;
}

let warned = false;

/** Says loudly, once, that a Vercel deploy has no shared room store, which breaks rooms at random. */
function warnUnshared(env: Env = process.env): void {
  if (!env.VERCEL || warned) return;
  warned = true;
  const rest = Object.keys(env).filter((name) => /_REST_/.test(name) && /(REDIS|KV)/.test(name));
  const hint = rest.length > 0 ? ` Found only REST variables (${rest.join(", ")}), which cannot be used: connect a store that also sets a redis:// URL.` : "";
  console.error(
    `No Redis URL on this Vercel deploy, so rooms live in each server instance alone and phones will often get Room not found. Checked ${KNOWN_NAMES.join(", ")} and any variable ending in REDIS_URL or KV_URL.${hint}`,
  );
}

/** For tests: lets the warning fire again. */
export function resetUnsharedWarning(): void {
  warned = false;
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
