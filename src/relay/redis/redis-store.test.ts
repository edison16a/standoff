import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newRoom, releaseHost } from "../room-state";
import { RedisStore } from "./redis-store";

/** Needs a real Redis, like the backend test. Set REDIS_TEST_URL to run it. */
const url = process.env.REDIS_TEST_URL;

describe.skipIf(!url)("RedisStore", () => {
  let redis: Redis;
  beforeAll(() => {
    redis = new Redis(url!);
  });
  afterAll(async () => {
    await redis.quit();
  });

  it("keeps a room whose host has left for about a minute, not hours", async () => {
    const store = new RedisStore(redis);
    await store.create(newRoom("TTLA", "token", "https://x/join/TTLA", "conn"));
    expect(await redis.ttl("standoff:room:TTLA")).toBeGreaterThan(60 * 60);
    await store.update("TTLA", (room) => ({ room: releaseHost(room, "conn", Date.now()), result: true }));
    expect(await redis.ttl("standoff:room:TTLA")).toBeLessThanOrEqual(60);
  });

  it("refuses to write once another instance has taken the lock", async () => {
    const store = new RedisStore(redis);
    await store.create(newRoom("LOCK", "token", "https://x/join/LOCK", "first"));
    // Stands in for a stall long enough for the lock to expire and pass
    // to another instance between our read and our write.
    const change = () => {
      void redis.set("standoff:lock:LOCK", "someone-else");
      return { room: { ...newRoom("LOCK", "token", "https://x/join/LOCK", "stale") }, result: true };
    };
    await expect(store.update("LOCK", change)).rejects.toThrow(/Lost the lock/);
    expect((await store.get("LOCK"))?.hostConn).toBe("first");
    await redis.del("standoff:lock:LOCK");
  });
});
