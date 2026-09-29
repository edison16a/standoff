import { afterEach, describe, expect, it, vi } from "vitest";
import { createBackend, findRedisUrl, sharedStore } from "./create-backend";

const HOLDER = Symbol.for("standoff.backend");

describe("finding Redis", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, HOLDER);
  });

  it("tries the usual names first, then any Marketplace name", () => {
    expect(findRedisUrl({ REDIS_URL: "redis://a", STORAGE_REDIS_URL: "redis://b" })).toBe("redis://a");
    expect(findRedisUrl({ STORAGE_REDIS_URL: "rediss://b" })).toBe("rediss://b");
    expect(findRedisUrl({ MY_KV_URL: "redis://c" })).toBe("redis://c");
  });

  it("ignores REST URLs, which the relay cannot use", () => {
    expect(findRedisUrl({ KV_REST_API_URL: "https://x.upstash.io", UPSTASH_REDIS_REST_URL: "https://y" })).toBeNull();
    expect(findRedisUrl({ REDIS_URL: "https://x.upstash.io" })).toBeNull();
  });

  it("counts a laptop's memory as shared, but not a Vercel deploy's", () => {
    expect(sharedStore({})).toBe(true);
    expect(sharedStore({ VERCEL: "1" })).toBe(false);
    expect(sharedStore({ VERCEL: "1", STORAGE_REDIS_URL: "redis://b" })).toBe(true);
  });

  it("stays quiet on Vercel without Redis, where memory is the normal setup", async () => {
    for (const name of Object.keys(process.env)) if (/(REDIS|KV)_URL$/.test(name)) vi.stubEnv(name, "");
    vi.stubEnv("VERCEL", "1");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const backend = await createBackend();
    expect(backend.shared).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });
});
