import { describe, expect, it } from "vitest";
import { DEG, quatFromDeviceEuler } from "@/games/kit/motion/math3d";
import { cornerCalibration, pointing, quickCalibration, rezone, scaleSpans, TARGET_INSET, toScreen, WHOLE_SCREEN } from "./aim-math";

/** A phone lying screen up with its top edge pointing at the given compass heading and elevation. */
const phone = (headingDeg: number, upDeg: number) => pointing(quatFromDeviceEuler(-headingDeg, upDeg, 0));

describe("aiming the phone at the screen", () => {
  it("reads heading and elevation from the top edge", () => {
    const p = phone(30, 10);
    expect(p.yaw / DEG).toBeCloseTo(30, 4);
    expect(p.pitch / DEG).toBeCloseTo(10, 4);
  });

  it("ignores twisting the phone in the hand", () => {
    const flat = pointing(quatFromDeviceEuler(-20, 5, 0));
    const twisted = pointing(quatFromDeviceEuler(-20, 5, 40));
    expect(twisted.pitch).toBeCloseTo(flat.pitch, 1);
  });

  it("puts the centre reading in the middle of the screen", () => {
    const calibration = quickCalibration(phone(100, 3));
    const point = toScreen(phone(100, 3), calibration);
    expect(point.x).toBeCloseTo(0, 6);
    expect(point.y).toBeCloseTo(0, 6);
  });

  it("maps the corner targets back onto themselves", () => {
    const center = phone(0, 0);
    const calibration = cornerCalibration(center, phone(-15, 8), phone(18, -9));
    const topLeft = toScreen(phone(-15, 8), calibration);
    const bottomRight = toScreen(phone(18, -9), calibration);
    expect(topLeft.x).toBeCloseTo(-TARGET_INSET, 6);
    expect(topLeft.y).toBeCloseTo(TARGET_INSET, 6);
    expect(bottomRight.x).toBeCloseTo(TARGET_INSET, 6);
    expect(bottomRight.y).toBeCloseTo(-TARGET_INSET, 6);
  });

  it("works across north, where the heading wraps", () => {
    const calibration = cornerCalibration(phone(359, 0), phone(344, 8), phone(14, -8));
    expect(toScreen(phone(4, 0), calibration).x).toBeGreaterThan(0);
    expect(toScreen(phone(354, 0), calibration).x).toBeLessThan(0);
  });

  it("falls back to the other side when a corner was pointed the wrong way", () => {
    const calibration = cornerCalibration(phone(0, 0), phone(5, 8), phone(18, -9));
    expect(calibration.left).toBeCloseTo(calibration.right, 6);
  });

  it("holds the aim just past the edge", () => {
    const calibration = quickCalibration(phone(0, 0));
    expect(toScreen(phone(90, 0), calibration).x).toBeCloseTo(1.15, 6);
  });
});

describe("aiming inside a zone of the screen", () => {
  const half = { x: 0.5, y: 0, w: 0.5, h: 1 };
  const quarter = { x: 0.5, y: 0.5, w: 0.5, h: 0.5 };

  it("leaves points alone between the same zone", () => {
    const p = { x: 0.1234, y: -0.9876 };
    expect(rezone(p, WHOLE_SCREEN, WHOLE_SCREEN)).toBe(p);
    expect(rezone(p, { ...half }, half)).toBe(p);
  });

  it("maps a spot on the screen between zones and back", () => {
    // The whole screen's right middle edge is the right edge of the right half.
    expect(rezone({ x: 1, y: 0 }, WHOLE_SCREEN, half)).toEqual({ x: 1, y: 0 });
    // The middle of the right half is the top middle edge of the bottom right quarter.
    expect(rezone({ x: 0, y: 0 }, half, quarter)).toEqual({ x: 0, y: 1 });
    const back = rezone(rezone({ x: 0.3, y: -0.6 }, quarter, WHOLE_SCREEN), WHOLE_SCREEN, quarter);
    expect(back.x).toBeCloseTo(0.3, 9);
    expect(back.y).toBeCloseTo(-0.6, 9);
  });

  it("scales spans to the whole screen and back, and never changes whole screen spans", () => {
    const calibration = cornerCalibration(phone(0, 0), phone(-15, 8), phone(18, -9));
    expect(scaleSpans(calibration, WHOLE_SCREEN)).toEqual(calibration);
    expect(scaleSpans(calibration, WHOLE_SCREEN, true)).toEqual(calibration);
    const whole = scaleSpans(calibration, quarter);
    expect(whole.left).toBeCloseTo(calibration.left * 2, 9);
    expect(whole.up).toBeCloseTo(calibration.up * 2, 9);
    const again = scaleSpans(whole, quarter, true);
    expect(again.right).toBeCloseTo(calibration.right, 9);
    expect(again.down).toBeCloseTo(calibration.down, 9);
  });
});
