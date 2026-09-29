import { describe, expect, it } from "vitest";
import { championFrame, HOLD_S, LIFT_S } from "./champion-pose";

describe("championFrame", () => {
  it("holds the belt at the chest first", () => {
    expect(championFrame(0).lift).toBe(0);
    expect(championFrame(HOLD_S * 0.9).lift).toBe(0);
  });

  it("drives it up over the head and keeps it there", () => {
    expect(championFrame(HOLD_S + LIFT_S / 2).lift).toBeCloseTo(0.5, 5);
    expect(championFrame(HOLD_S + LIFT_S + 0.25).lift).toBeGreaterThan(1);
    for (let t = HOLD_S + LIFT_S + 0.6; t < 20; t += 0.1) expect(championFrame(t).lift).toBeCloseTo(1, 5);
  });

  it("pumps the arms now and then once it is up, never before", () => {
    let pumps = 0;
    let was = false;
    for (let t = 0; t < 12; t += 1 / 60) {
      const frame = championFrame(t);
      if (t < HOLD_S + LIFT_S) expect(frame.pump).toBe(0);
      const up = frame.pump > 0.5;
      if (up && !was) pumps++;
      was = up;
    }
    expect(pumps).toBeGreaterThanOrEqual(3);
  });
});
