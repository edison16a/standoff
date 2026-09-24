import { describe, expect, it } from "vitest";
import { quatFromDeviceEuler } from "@/games/kit/motion/math3d";
import { HOLD_MS, SteadyLevel } from "./steady-level";

const STEP = 1000 / 60;

function hold(level: SteadyLevel, pose: (t: number) => [number, number, number], from: number, ms: number) {
  let reading = level.update(quatFromDeviceEuler(...pose(from)), from);
  for (let t = from + STEP; t < from + ms; t += STEP) reading = level.update(quatFromDeviceEuler(...pose(t)), t);
  return reading;
}

describe("SteadyLevel", () => {
  it("fills up while the phone is flat and still, and is done after the hold", () => {
    const level = new SteadyLevel();
    const early = hold(level, () => [30, 2, -1], 0, HOLD_MS * 0.5);
    expect(early.level).toBe(true);
    expect(early.progress).toBeLessThan(1);
    expect(hold(level, () => [30, 2, -1], HOLD_MS * 0.5, HOLD_MS * 1.2).progress).toBe(1);
  });

  it("never fills while the phone is tipped", () => {
    const level = new SteadyLevel();
    const reading = hold(level, () => [0, 20, 0], 0, 3000);
    expect(reading.level).toBe(false);
    expect(reading.progress).toBe(0);
  });

  it("drains when the hand wobbles, even when level on average", () => {
    const level = new SteadyLevel();
    const reading = hold(level, (t) => [8 * Math.sin(t / 60), 2 * Math.sin(t / 90), 0], 0, 3000);
    expect(reading.steady).toBe(false);
    expect(reading.progress).toBeLessThan(0.3);
  });
});
