import { describe, expect, it } from "vitest";
import { BOARD } from "../tuning";
import { BODY } from "./body-spec";
import type { Steps } from "../finish/spec";
import { drivePosition, driveHeight, landTime } from "./drive-flight";

const H = 1 / 240;
interface Plan {
  takeoff: number;
  finish: number;
  rimHang: number;
  peak: number;
  hangY: number;
  side: 1 | -1;
  from: { x: number; z: number };
  to: { x: number; z: number };
}

const plan = (over: Partial<Plan> = {}): Plan => ({
  takeoff: 0.36,
  finish: 0.84,
  rimHang: 0,
  peak: 0.72,
  hangY: 0.5,
  side: 1,
  from: { x: 0.5, z: 4.6 },
  to: { x: 0.1, z: 2.0 },
  ...over,
});

describe("the flight of a dunk or a layup", () => {
  it("leaves the floor at the end of the gather and has the hand at the rim exactly as the ball goes", () => {
    for (const finish of [0.7, 0.8, 0.9]) {
      const d = plan({ finish });
      expect(driveHeight(d, d.takeoff - 0.01)).toBe(0);
      expect(driveHeight(d, d.finish)).toBeCloseTo(d.peak, 9);
    }
  });

  it("falls at one g the whole time it is free, and lands when the plan says", () => {
    const d = plan();
    const land = landTime(d);
    for (let t = d.takeoff + H; t < land - H; t += H) {
      const accel = (driveHeight(d, t + H) - 2 * driveHeight(d, t) + driveHeight(d, t - H)) / (H * H);
      expect(accel).toBeCloseTo(-BODY.gravity, 3);
    }
    expect(driveHeight(d, land)).toBeCloseTo(0, 6);
  });

  it("hangs on the rim with the arms straight, under the slam, then drops from rest", () => {
    const d = plan({ rimHang: 0.4 });
    expect(driveHeight(d, d.finish + 0.2)).toBeCloseTo(d.hangY, 9);
    const land = landTime(d);
    expect(land).toBeCloseTo(d.finish + 0.4 + Math.sqrt((2 * d.hangY) / BODY.gravity), 9);
    expect(driveHeight(d, land)).toBeCloseTo(0, 9);
  });

  it("moves along the floor without a jump, slowing through the gather and steady in the air", () => {
    const d = plan();
    const p = { x: 0, z: 0 };
    const q = { x: 0, z: 0 };
    drivePosition(d, "two", 0, p);
    expect(p).toEqual(d.from);
    const speeds: number[] = [];
    for (let t = 0; t < landTime(d); t += H) {
      drivePosition(d, "two", t, p);
      drivePosition(d, "two", t + H, q);
      speeds.push(Math.hypot(q.x - p.x, q.z - p.z) / H);
    }
    expect(Math.max(...speeds)).toBeLessThan(8);
    const air = speeds.slice(Math.ceil(d.takeoff / H) + 1, Math.floor(d.finish / H) - 1);
    for (const v of air) expect(v).toBeCloseTo(air[0]!, 6);
    drivePosition(d, "two", d.finish, p);
    expect(p.x).toBeCloseTo(d.to.x, 9);
    expect(p.z).toBeCloseTo(d.to.z, 9);
  });

  it("steps out the other way first on a euro step and stops dead on a jump stop", () => {
    const d = plan({ from: { x: 0, z: 4.6 }, to: { x: 0, z: 2.0 } });
    const p = { x: 0, z: 0 };
    drivePosition(d, "euro", d.takeoff * 0.3, p);
    // Facing the rim (-z) the right is +x, and the first step goes to the left of a drive going right.
    expect(p.x).toBeLessThan(-0.2);
    drivePosition(d, "euro", d.takeoff, p);
    expect(p.x).toBeCloseTo(0, 6);
    const steps: Steps = "stop";
    const q = { x: 0, z: 0 };
    drivePosition(d, steps, d.takeoff - H, p);
    drivePosition(d, steps, d.takeoff, q);
    expect(Math.hypot(q.x - p.x, q.z - p.z) / H).toBeLessThan(0.1);
  });

  it("never carries a layup on under the glass", () => {
    const d = plan({ to: { x: 0.2, z: 1.6 } });
    const p = { x: 0, z: 0 };
    for (let t = d.finish; t < landTime(d); t += H) {
      drivePosition(d, "two", t, p);
      expect(p.z).toBeGreaterThanOrEqual(Math.min(d.to.z, BOARD.face + 0.35) - 1e-9);
    }
  });
});
