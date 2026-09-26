import { describe, expect, it } from "vitest";
import { DEG, quatFromDeviceEuler } from "@/games/kit/motion/math3d";
import { aimOf, buildCalibration, controlFromAim, DEFAULT_GUARD, DEFAULT_SPANS, EDGE_UP, EDGE_YAW } from "./sword-aim";

/** A phone held flat, top edge forward, turned `right` degrees to the right and tipped `up` degrees up. */
const flat = (right: number, up: number) => quatFromDeviceEuler(-right, up, 0);
/** The same phone held upright like a hilt, back of the phone forward. */
const upright = (right: number, up: number) => quatFromDeviceEuler(-right, 90 + up, 0);

/** Corners 16 degrees across and 10 up or down from the middle: the targets sit at 0.8 of the way to each edge. */
const corners = (grip: typeof flat) => ({
  "top-left": grip(-16, 10),
  "top-right": grip(16, 10),
  "bottom-right": grip(16, -10),
  "bottom-left": grip(-16, -10),
});

describe("buildCalibration", () => {
  it("learns how far this player turns to reach each edge of their view", () => {
    const calibration = buildCalibration(flat(0, 5), corners((r, u) => flat(r, u + 5)), null);
    expect(calibration.spans.left).toBeCloseTo(20 * DEG, 3);
    expect(calibration.spans.right).toBeCloseTo(20 * DEG, 3);
    expect(calibration.spans.up).toBeCloseTo(12.5 * DEG, 3);
    expect(calibration.spans.down).toBeCloseTo(12.5 * DEG, 3);
    expect(calibration.guard).toEqual(DEFAULT_GUARD);
  });

  it("reads the middle as the middle and each edge as an edge, whatever the grip", () => {
    for (const grip of [flat, upright]) {
      const calibration = buildCalibration(grip(0, 0), corners(grip), null);
      const middle = aimOf(grip(0, 0), calibration);
      expect(middle.x).toBeCloseTo(0, 3);
      expect(middle.y).toBeCloseTo(0, 3);
      const topRight = aimOf(grip(20, 12.5), calibration);
      expect(topRight.x).toBeCloseTo(1, 2);
      expect(topRight.y).toBeCloseTo(1, 2);
      const bottomLeft = aimOf(grip(-20, -12.5), calibration);
      expect(bottomLeft.x).toBeCloseTo(-1, 2);
      expect(bottomLeft.y).toBeCloseTo(-1, 2);
    }
  });

  it("keeps each side separate, for a player sitting off to one side", () => {
    const calibration = buildCalibration(flat(0, 0), { "top-left": flat(-8, 10), "top-right": flat(24, 10) }, null);
    expect(calibration.spans.left).toBeCloseTo(10 * DEG, 3);
    expect(calibration.spans.right).toBeCloseTo(30 * DEG, 3);
    // No bottom corner: the bottom borrows the top.
    expect(calibration.spans.down).toBeCloseTo(calibration.spans.up, 6);
  });

  it("ignores a corner pointed the wrong way, and falls back to defaults with none", () => {
    const calibration = buildCalibration(flat(0, 0), { "top-left": flat(12, -10), "top-right": flat(16, 10) }, null);
    expect(calibration.spans.left).toBeCloseTo(calibration.spans.right, 6);
    expect(buildCalibration(flat(0, 0), {}, null).spans).toEqual(DEFAULT_SPANS);
  });

  it("takes the guard where the player showed it", () => {
    const calibration = buildCalibration(flat(0, 0), corners(flat), flat(5, -10));
    expect(calibration.guard.x).toBeCloseTo(0.25, 2);
    expect(calibration.guard.y).toBeCloseTo(-0.8, 2);
  });
});

describe("controlFromAim", () => {
  it("points the blade where the phone points, with the edges at wide angles", () => {
    expect(controlFromAim({ x: 1, y: 0 }, 0)).toMatchObject({ yaw: EDGE_YAW, pitch: 0 });
    expect(controlFromAim({ x: 0, y: 1 }, 0).pitch).toBeCloseTo(EDGE_UP);
    // Past the top edge it keeps rising, for a high guard.
    expect(controlFromAim({ x: 0, y: 1.4 }, 0).pitch).toBeGreaterThan(1.3);
  });

  it("stretches the arm at the middle and bends it at the guard", () => {
    const guard = { x: 0.2, y: -0.8 };
    expect(controlFromAim({ x: 0.05, y: 0 }, 0, guard).reach).toBe(1);
    expect(controlFromAim(guard, 0, guard).reach).toBe(0);
    const between = controlFromAim({ x: 0.1, y: -0.4 }, 0, guard).reach;
    expect(between).toBeGreaterThan(0);
    expect(between).toBeLessThan(1);
    // Off to the side is as bent as the guard.
    expect(controlFromAim({ x: -1, y: 0.8 }, 0, guard).reach).toBe(0);
  });

  it("passes the roll straight through", () => {
    expect(controlFromAim({ x: 0, y: 0 }, 0.7).roll).toBe(0.7);
  });
});
