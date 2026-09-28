import { describe, expect, it } from "vitest";
import { quatFromDeviceEuler } from "@/games/kit/motion/math3d";
import { fitCalibration, type AimSample } from "./aim-fit";
import { cornerCalibration, DEFAULT_SPAN, pointing, toScreen } from "./aim-math";
import { AIM_PLANS, movedOn, TARGET_POINTS, type AimTarget } from "./aim-targets";

/** A phone lying screen up with its top edge pointing at the given compass heading and elevation. */
const phone = (headingDeg: number, upDeg: number) => pointing(quatFromDeviceEuler(-headingDeg, upDeg, 0));

/** A player whose screen spans the given degrees each way from a heading, pointing perfectly at every target. */
function player(heading: number, spans: { left: number; right: number; up: number; down: number }, plan: readonly AimTarget[]): AimSample[] {
  return plan.map((name) => {
    const target = TARGET_POINTS[name];
    const x = target.x * (target.x < 0 ? spans.left : spans.right);
    const y = target.y * (target.y < 0 ? spans.down : spans.up);
    return { target, reading: phone(heading + x, y) };
  });
}

describe("fitting a calibration to the targets", () => {
  it("waits for a middle reading", () => {
    expect(fitCalibration([])).toBeNull();
    expect(fitCalibration([{ target: TARGET_POINTS["top-left"], reading: phone(0, 0) }])).toBeNull();
  });

  it("uses default spans from the middle alone", () => {
    const fit = fitCalibration(player(10, { left: 20, right: 20, up: 10, down: 10 }, ["center"]))!;
    expect(fit.left).toBe(DEFAULT_SPAN.x);
    expect(fit.up).toBe(DEFAULT_SPAN.y);
  });

  it("gives the same answer as the three target calibration for the shooter plan", () => {
    const samples = player(40, { left: 18, right: 22, up: 11, down: 9 }, AIM_PLANS.shooter);
    const fit = fitCalibration(samples)!;
    const classic = cornerCalibration(samples[0]!.reading, samples[1]!.reading, samples[2]!.reading);
    for (const key of ["left", "right", "up", "down"] as const) expect(fit[key]).toBeCloseTo(classic[key], 9);
  });

  it("maps every sword target back onto itself, across north, for a player sitting off to one side", () => {
    const samples = player(356, { left: 14, right: 24, up: 12, down: 8 }, AIM_PLANS.sword);
    const fit = fitCalibration(samples)!;
    for (const { target, reading } of samples) {
      const at = toScreen(reading, fit);
      expect(at.x).toBeCloseTo(target.x, 2);
      expect(at.y).toBeCloseTo(target.y, 2);
    }
  });

  it("averages two middle readings, so one shaky reading counts half", () => {
    const samples = player(0, { left: 20, right: 20, up: 10, down: 10 }, AIM_PLANS.sword);
    samples[0] = { ...samples[0]!, reading: phone(2, 0) };
    samples[5] = { ...samples[5]!, reading: phone(-2, 0) };
    expect(toScreen(phone(0, 0), fitCalibration(samples)!).x).toBeCloseTo(0, 6);
  });

  it("leaves out a corner pointed the wrong way and borrows the other side", () => {
    const samples = player(0, { left: 20, right: 20, up: 10, down: 10 }, AIM_PLANS.sword);
    // The top left corner pointed right of the middle.
    samples[1] = { ...samples[1]!, reading: phone(5, 8) };
    const fit = fitCalibration(samples)!;
    // The bottom left corner still measures the left side.
    expect(fit.left).toBeCloseTo(fit.right, 2);
  });
});

describe("moving on to the next target", () => {
  it("waits until the phone has turned away from the last target taken", () => {
    expect(movedOn(phone(10, 0), null)).toBe(true);
    expect(movedOn(phone(10.5, 0.5), phone(10, 0))).toBe(false);
    expect(movedOn(phone(16, 4), phone(10, 0))).toBe(true);
  });
});
