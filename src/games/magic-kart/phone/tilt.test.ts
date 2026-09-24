import { describe, expect, it } from "vitest";
import { cross, quatFromDeviceEuler, vec, type Quat, type Vec3 } from "@/games/kit/motion/math3d";
import { steerFromWheel, tiltOf, wheelAngle } from "./tilt";

const DEG = Math.PI / 180;

function turnAbout(axis: Vec3, deg: number): Quat {
  const h = (deg * DEG) / 2;
  return { w: Math.cos(h), x: axis.x * Math.sin(h), y: axis.y * Math.sin(h), z: axis.z * Math.sin(h) };
}

function mul(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

/**
 * A phone held like a wheel, upright in landscape and facing the player,
 * then turned clockwise by `turn`, leaned back by `lean` and the player
 * facing `heading`. Angle 90 has the top edge on the player's left, which
 * is gamma -90 with the player looking east. Angle 270 is gamma 90 with
 * the player looking west.
 */
function held(angle: 90 | 270, turn: number, lean = 0, heading = 0): Quat {
  const base = quatFromDeviceEuler(0, 0, angle === 90 ? -90 : 90);
  const look = angle === 90 ? vec(1, 0, 0) : vec(-1, 0, 0);
  const pose = mul(turnAbout(cross(vec(0, 0, 1), look), lean), mul(turnAbout(look, turn), base));
  return mul(turnAbout(vec(0, 0, 1), heading), pose);
}

describe("wheel steering", () => {
  it("reads upright and level as straight, in both landscapes", () => {
    for (const angle of [90, 270] as const) {
      const tilt = tiltOf(held(angle, 0), angle);
      expect(tilt.wheel).toBeCloseTo(0);
      expect(tilt.lean).toBeCloseTo(0);
    }
  });

  it("turns with beta when upright, as the fake sensors drive it", () => {
    // Upright in landscape facing the player is beta 0 and gamma -90 or 90. Turning the wheel changes beta.
    expect(tiltOf(quatFromDeviceEuler(0, 0, -90), 90).wheel).toBeCloseTo(0);
    expect(tiltOf(quatFromDeviceEuler(0, 20, -90), 90).wheel).toBeCloseTo(20 * DEG);
    expect(tiltOf(quatFromDeviceEuler(0, -20, 90), 270).wheel).toBeCloseTo(20 * DEG);
    expect(steerFromWheel(tiltOf(quatFromDeviceEuler(0, 20, -90), 90).wheel, 0)).toBeGreaterThan(0.4);
  });

  it("steers right when turned clockwise, whichever way round the phone is", () => {
    for (const angle of [90, 270] as const) {
      expect(tiltOf(held(angle, 18), angle).wheel).toBeCloseTo(18 * DEG);
      expect(tiltOf(held(angle, -18), angle).wheel).toBeCloseTo(-18 * DEG);
    }
  });

  it("keeps the angle when leaned back or forward, and ignores the compass", () => {
    for (const lean of [-45, -20, 20, 40, 55]) {
      const tilt = tiltOf(held(90, 20, lean, 70), 90);
      expect(tilt.wheel).toBeCloseTo(20 * DEG);
      expect(tilt.lean).toBeCloseTo(lean * DEG);
    }
  });

  it("eases over to the dropped end as the phone lies flat, never changing side", () => {
    let last = Infinity;
    for (let lean = 0; lean <= 88; lean += 4) {
      const wheel = tiltOf(held(90, 20, lean), 90).wheel;
      expect(wheel).toBeGreaterThan(0);
      expect(wheel).toBeLessThanOrEqual(last + 1e-9);
      last = wheel;
    }
    // Lying flat, dropping the right end still steers right.
    expect(tiltOf(quatFromDeviceEuler(0, 15, 0), 90).wheel).toBeCloseTo(15 * DEG);
  });

  it("reads the same when the browser flips its angles at gamma's limit", () => {
    // Gamma stops at 90, so just past upright the browser reports alpha + 180, 180 - beta and gamma a half turn round.
    for (const [b, g] of [[10, -92], [-12, 93], [25, -95]] as const) {
      const one = tiltOf(quatFromDeviceEuler(30, b, g), 90);
      const other = tiltOf(quatFromDeviceEuler(210, 180 - b, g > 0 ? g - 180 : g + 180), 90);
      expect(other.wheel).toBeCloseTo(one.wheel);
      expect(other.lean).toBeCloseTo(one.lean);
    }
  });

  it("has a dead zone, a gentle middle and full lock", () => {
    expect(steerFromWheel(2 * DEG, 0)).toBe(0);
    expect(steerFromWheel(15 * DEG, 0)).toBeGreaterThan(0.2);
    expect(steerFromWheel(15 * DEG, 0)).toBeLessThan(0.5);
    expect(steerFromWheel(40 * DEG, 0)).toBe(1);
    expect(steerFromWheel(-40 * DEG, 0)).toBe(-1);
    // Measured from the calibrated level.
    expect(steerFromWheel(6 * DEG, 5 * DEG)).toBe(0);
  });

  it("never flips to the other lock when turned past the limit", () => {
    expect(steerFromWheel(-170 * DEG, 0, 1)).toBe(1);
    expect(steerFromWheel(170 * DEG, 0, -1)).toBe(-1);
    expect(steerFromWheel(120 * DEG, 0, 0)).toBe(1);
  });

  it("keeps the calibration when the phone is turned round to the other landscape", () => {
    // Calibrated with the player's own level a little clockwise, top edge on the left.
    const zero = tiltOf(held(90, 3, 15), 90).wheel;
    // Turned round, held the same way in the hands, it still reads straight, and turning still steers right.
    expect(steerFromWheel(tiltOf(held(270, 3, 15), 270).wheel, zero)).toBe(0);
    expect(steerFromWheel(tiltOf(held(270, 23, 15), 270).wheel, zero)).toBeGreaterThan(0.4);
  });

  it("holds the last landscape while the page swings upright", () => {
    expect(wheelAngle(270, 90)).toBe(270);
    expect(wheelAngle(0, 270)).toBe(270);
    expect(wheelAngle(180, 90)).toBe(90);
    expect(wheelAngle(-90, 90)).toBe(270);
  });
});
