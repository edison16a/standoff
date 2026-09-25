import { describe, expect, it } from "vitest";
import { approach, restPose } from "./pose";
import { beyond } from "./strike";

describe("approach", () => {
  it("copies a turn in progress and rolls upright the short way once it ends", () => {
    const current = restPose();
    const target = restPose();
    target.flip = -15;
    approach(current, target, 18, 1 / 60);
    expect(current.flip).toBe(-15);
    target.flip = 0;
    approach(current, target, 18, 1 / 60);
    // -15 radians is about -2.43 past whole turns, so it heads back from there, not from -15.
    expect(current.flip).toBeGreaterThan(-2.5);
    expect(current.flip).toBeLessThan(0);
    for (let i = 0; i < 120; i++) approach(current, target, 18, 1 / 60);
    expect(Math.abs(current.flip)).toBeLessThan(1e-3);
  });
});

describe("beyond", () => {
  it("carries a swing on past its end by a share of its length, capped", () => {
    expect(beyond({ torsoY: 0 }, { torsoY: 1 }, 0.2).torsoY).toBeCloseTo(1.2);
    expect(beyond({ torsoY: 0 }, { torsoY: 3 }, 0.2).torsoY).toBeCloseTo(3.3);
    expect(beyond({}, { torsoY: 1 }, 0.2).torsoY).toBe(1);
  });
});
