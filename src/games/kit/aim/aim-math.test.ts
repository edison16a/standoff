import { describe, expect, it } from "vitest";
import { DEG, quatFromDeviceEuler } from "@/games/kit/motion/math3d";
import { cornerCalibration, pointing, quickCalibration, TARGET_INSET, toScreen } from "./aim-math";

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
