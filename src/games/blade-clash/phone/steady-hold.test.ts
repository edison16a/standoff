import { describe, expect, it } from "vitest";
import { quatFromDeviceEuler } from "@/games/kit/motion/math3d";
import { HOLD_MS, SteadyHold } from "./steady-hold";

const STEP = 1000 / 60;

function run(hold: SteadyHold, pose: (t: number) => [number, number, number], from: number, ms: number) {
  let reading = hold.update(quatFromDeviceEuler(...pose(from)), from);
  for (let t = from + STEP; t < from + ms; t += STEP) reading = hold.update(quatFromDeviceEuler(...pose(t)), t);
  return reading;
}

describe("SteadyHold", () => {
  it("fills while the phone is still, whatever way it points, and is done after the hold", () => {
    const hold = new SteadyHold();
    const early = run(hold, () => [30, 50, -20], 0, HOLD_MS * 0.6);
    expect(early.steady).toBe(true);
    expect(early.progress).toBeLessThan(1);
    expect(run(hold, () => [30, 50, -20], HOLD_MS * 0.6, HOLD_MS).progress).toBe(1);
  });

  it("drains when the hand wobbles", () => {
    const hold = new SteadyHold();
    const reading = run(hold, (t) => [10 * Math.sin(t / 60), 3 * Math.sin(t / 90), 0], 0, 3000);
    expect(reading.steady).toBe(false);
    expect(reading.progress).toBeLessThan(0.3);
  });

  it("starts over after a reset", () => {
    const hold = new SteadyHold();
    run(hold, () => [0, 0, 0], 0, HOLD_MS * 2);
    hold.reset();
    expect(hold.update(quatFromDeviceEuler(0, 0, 0), 5000).progress).toBe(0);
  });
});
