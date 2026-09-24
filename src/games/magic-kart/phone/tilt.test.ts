import { describe, expect, it } from "vitest";
import { quatFromDeviceEuler } from "@/games/kit/motion/math3d";
import { steerFromRoll, tiltOf, zeroFor } from "./tilt";

describe("tilt steering", () => {
  it("reads flat as level", () => {
    const tilt = tiltOf(quatFromDeviceEuler(0, 0, 0), 90);
    expect(tilt.roll).toBeCloseTo(0);
    expect(tilt.pitch).toBeCloseTo(0);
  });

  it("steers right when the right end of a sideways phone goes down", () => {
    // Turned anticlockwise (angle 90) the top edge is on the left, so lifting it (beta up) lowers the right end.
    expect(tiltOf(quatFromDeviceEuler(0, 15, 0), 90).roll).toBeCloseTo((15 * Math.PI) / 180);
    // Turned the other way round the same tilt lifts the right end instead.
    expect(tiltOf(quatFromDeviceEuler(0, 15, 0), 270).roll).toBeCloseTo((-15 * Math.PI) / 180);
  });

  it("ignores the compass and tipping the phone toward the player", () => {
    const base = tiltOf(quatFromDeviceEuler(0, 12, 0), 90).roll;
    expect(tiltOf(quatFromDeviceEuler(80, 12, 0), 90).roll).toBeCloseTo(base);
    // Tipping toward the face turns about the screen's long axis, so the roll stays put.
    expect(tiltOf(quatFromDeviceEuler(0, 12, -35), 90).roll).toBeCloseTo(base, 1);
  });

  it("has a dead zone, a gentle middle and full lock", () => {
    const deg = Math.PI / 180;
    expect(steerFromRoll(1 * deg, 0)).toBe(0);
    expect(steerFromRoll(12 * deg, 0)).toBeGreaterThan(0.2);
    expect(steerFromRoll(12 * deg, 0)).toBeLessThan(0.5);
    expect(steerFromRoll(40 * deg, 0)).toBe(1);
    expect(steerFromRoll(-40 * deg, 0)).toBe(-1);
    // Measured from the calibrated resting roll.
    expect(steerFromRoll(5 * deg, 5 * deg)).toBe(0);
  });

  it("keeps the calibration when the phone is flipped to the other landscape", () => {
    // Calibrated resting a little right end down, turned anticlockwise.
    const resting = quatFromDeviceEuler(0, 4, 0);
    const zero = tiltOf(resting, 90).roll;
    expect(steerFromRoll(tiltOf(resting, 90).roll, zeroFor(zero, 90, 90))).toBe(0);
    // Flipped round, the same pose must still read as straight ahead.
    const flipped = tiltOf(resting, 270).roll;
    expect(steerFromRoll(flipped, zeroFor(zero, 90, 270))).toBe(0);
    // And tilting from there still steers the right way.
    expect(steerFromRoll(tiltOf(quatFromDeviceEuler(0, -16, 0), 270).roll, zeroFor(zero, 90, 270))).toBeGreaterThan(0.2);
  });
});
