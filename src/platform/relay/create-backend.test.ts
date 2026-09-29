import { afterEach, describe, expect, it, vi } from "vitest";
import { createBackend, findRedisUrl, sharedStore } from "./create-backend";

const HOLDER = Symbol.for("standoff.backend");

describe("finding Redis", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, HOLDER);
  });

  it("reads only the three usual names", () => {
    expect(findRedisUrl({ REDIS_URL: "redis://a", STORAGE_REDIS_URL: "redis://b" })).toBe("redis://a");
    expect(findRedisUrl({ KV_URL: "rediss://k" })).toBe("rediss://k");
    expect(findRedisUrl({ UPSTASH_REDIS_URL: "redis://u" })).toBe("redis://u");
    // A leftover variable under another name never moves a project to Redis.
    expect(findRedisUrl({ STORAGE_REDIS_URL: "rediss://b" })).toBeNull();
    expect(findRedisUrl({ MY_KV_URL: "redis://c" })).toBeNull();
  });

  it("ignores REST URLs, which the relay cannot use", () => {
    expect(findRedisUrl({ KV_REST_API_URL: "https://x.upstash.io", UPSTASH_REDIS_REST_URL: "https://y" })).toBeNull();
    expect(findRedisUrl({ REDIS_URL: "https://x.upstash.io" })).toBeNull();
  });

  it("counts a laptop's memory as shared, but not a Vercel deploy's", () => {
    expect(sharedStore({})).toBe(true);
    expect(sharedStore({ VERCEL: "1" })).toBe(false);
    expect(sharedStore({ VERCEL: "1", REDIS_URL: "redis://b" })).toBe(true);
    expect(sharedStore({ VERCEL: "1", STORAGE_REDIS_URL: "redis://b" })).toBe(false);
  });

  it("stays quiet on Vercel without Redis, where memory is the normal setup", async () => {
    for (const name of ["REDIS_URL", "KV_URL", "UPSTASH_REDIS_URL"]) vi.stubEnv(name, "");
    vi.stubEnv("VERCEL", "1");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const backend = await createBackend();
    expect(backend.shared).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });
});
