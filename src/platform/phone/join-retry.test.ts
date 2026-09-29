import { describe, expect, it } from "vitest";
import { joinRetryDelay } from "./join-retry";

const middle = () => 0.5;

describe("joinRetryDelay", () => {
  it("gives a typed code a few quick tries, then stops", () => {
    expect([0, 1, 2, 3, 4].map((n) => joinRetryDelay("not-found", n, false, middle))).toEqual([400, 800, 1600, 2400, null]);
  });

  it("gives a seated phone about nine seconds to get back in", () => {
    const waits: number[] = [];
    for (let n = 0; ; n++) {
      const wait = joinRetryDelay("not-found", n, true, middle);
      if (wait === null) break;
      waits.push(wait);
    }
    expect(waits.reduce((a, b) => a + b, 0)).toBe(9500);
  });

  it("spreads a room's phones out a little", () => {
    expect(joinRetryDelay("unavailable", 0, false, () => 0)).toBe(350);
    expect(joinRetryDelay("unavailable", 0, false, () => 1)).toBe(650);
  });
});
