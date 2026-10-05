import { describe, expect, it } from "vitest";
import { BOARD } from "../tuning";
import { BODY } from "./body-spec";
import { drivePosition, driveHeight, HANG_DROP, landTime } from "./drive-flight";

const H = 1 / 240;
const plan = (over: Partial<{ takeoff: number; finish: number; rimHang: number; peak: number }> = {}) => ({
  takeoff: 0.36,
  finish: 0.84,
  rimHang: 0,
  peak: 0.72,
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

  it("hangs on the rim a hand's length under the slam, then drops from rest", () => {
    const d = plan({ rimHang: 0.4 });
    expect(driveHeight(d, d.finish + 0.2)).toBeCloseTo(d.peak - HANG_DROP, 9);
    const land = landTime(d);
    expect(land).toBeCloseTo(d.finish + 0.4 + Math.sqrt((2 * (d.peak - HANG_DROP)) / BODY.gravity), 9);
    expect(driveHeight(d, land)).toBeCloseTo(0, 9);
  });

  it("moves along the floor without a jump, slowing through the gather and steady in the air", () => {
    const d = plan();
    const p = { x: 0, z: 0 };
    const q = { x: 0, z: 0 };
    drivePosition(d, 0, p);
    expect(p).toEqual(d.from);
    const speeds: number[] = [];
    for (let t = 0; t < landTime(d); t += H) {
      drivePosition(d, t, p);
      drivePosition(d, t + H, q);
      speeds.push(Math.hypot(q.x - p.x, q.z - p.z) / H);
    }
    expect(Math.max(...speeds)).toBeLessThan(8);
    const air = speeds.slice(Math.ceil(d.takeoff / H) + 1, Math.floor(d.finish / H) - 1);
    for (const v of air) expect(v).toBeCloseTo(air[0]!, 6);
    drivePosition(d, d.finish, p);
    expect(p.x).toBeCloseTo(d.to.x, 9);
    expect(p.z).toBeCloseTo(d.to.z, 9);
  });

  it("never carries a layup on under the glass", () => {
    const d = plan({ to: { x: 0.2, z: 1.6 } });
    const p = { x: 0, z: 0 };
    for (let t = d.finish; t < landTime(d); t += H) {
      drivePosition(d, t, p);
      expect(p.z).toBeGreaterThanOrEqual(Math.min(d.to.z, BOARD.face + 0.35) - 1e-9);
    }
  });
});
