import { describe, expect, it } from "vitest";
import { DRIFT } from "../engine/tuning";
import { DEAD_ZONE, FULL_LOCK, steerFromWheel } from "./tilt";

const DEG = Math.PI / 180;
const at = (deg: number) => steerFromWheel(deg * DEG, 0);

describe("steering response", () => {
  it("reaches full lock at about 50 degrees, with a small dead zone", () => {
    expect(FULL_LOCK / DEG).toBeGreaterThanOrEqual(45);
    expect(FULL_LOCK / DEG).toBeLessThanOrEqual(60);
    expect(DEAD_ZONE / DEG).toBeCloseTo(3);
  });

  it("gives nothing held still, a little for a slight turn and a fair turn for a normal one", () => {
    expect(at(0)).toBe(0);
    expect(at(3)).toBeCloseTo(0, 9);
    expect(at(10)).toBeGreaterThan(0.05);
    expect(at(10)).toBeLessThan(0.15);
    expect(at(25)).toBeGreaterThan(0.3);
    expect(at(25)).toBeLessThan(0.45);
    expect(at(50)).toBeCloseTo(1);
    expect(at(70)).toBe(1);
  });

  it("is the same to the left as to the right", () => {
    for (const deg of [0, 3, 10, 25, 50, 70]) expect(at(-deg)).toBeCloseTo(-at(deg), 12);
  });

  it("never eases off as the wheel turns further", () => {
    let last = -Infinity;
    for (let deg = -80; deg <= 80; deg += 0.5) {
      const steer = at(deg);
      expect(steer).toBeGreaterThanOrEqual(last);
      last = steer;
    }
  });

  it("is measured from the calibrated level", () => {
    expect(steerFromWheel(6 * DEG, 5 * DEG)).toBe(0);
    expect(steerFromWheel(30 * DEG, 5 * DEG)).toBeCloseTo(at(25));
  });

  it("starts drifts at a real turn of the wheel, not a nudge", () => {
    // Braking into a bend needs about a normal turn, lifting off needs a firm one.
    expect(at(20)).toBeLessThan(DRIFT.brakeSteer);
    expect(at(30)).toBeGreaterThan(DRIFT.brakeSteer);
    expect(at(32)).toBeLessThan(DRIFT.liftSteer);
    expect(at(42)).toBeGreaterThan(DRIFT.liftSteer);
  });
});
