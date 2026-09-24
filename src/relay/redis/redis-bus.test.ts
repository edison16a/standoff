import type { Redis } from "ioredis";
import { describe, expect, it, vi } from "vitest";
import { RedisBus } from "./redis-bus";

describe("RedisBus", () => {
  it("sends a fresh SUBSCRIBE after one fails, instead of pretending the channel is live", async () => {
    const subscriber = {
      on: vi.fn(),
      subscribe: vi.fn().mockRejectedValueOnce(new Error("Redis is down")).mockResolvedValue(1),
      unsubscribe: vi.fn().mockResolvedValue(1),
    };
    const bus = new RedisBus({} as Redis, subscriber as unknown as Redis);
    await expect(bus.subscribe("room", () => undefined)).rejects.toThrow("Redis is down");
    await bus.subscribe("room", () => undefined);
    expect(subscriber.subscribe).toHaveBeenCalledTimes(2);
  });
});
