import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rate-limiter";

describe("RateLimiter", () => {
  it("allows a burst, then refills over time", () => {
    let now = 0;
    const limiter = new RateLimiter(10, 5, () => now);
    const burst = Array.from({ length: 6 }, () => limiter.take());
    expect(burst).toEqual([true, true, true, true, true, false]);
    now += 200;
    expect(limiter.take()).toBe(true);
    expect(limiter.take()).toBe(true);
    expect(limiter.take()).toBe(false);
  });
});
