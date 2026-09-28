import { describe, expect, it } from "vitest";
import { HOLD_MS, HoldProgress, SteadyWindow, STILL_ANGLE } from "./steady-hold";

const STEP = 1000 / 60;
const gap = (a: number, b: number) => Math.abs(a - b);

describe("HoldProgress", () => {
  it("fills over the hold while the condition holds, and stops at full", () => {
    const hold = new HoldProgress();
    let value = 0;
    for (let t = 0; t <= HOLD_MS / 2; t += STEP) value = hold.update(true, t);
    expect(value).toBeGreaterThan(0.4);
    expect(value).toBeLessThan(0.6);
    for (let t = HOLD_MS / 2; t <= HOLD_MS * 2; t += STEP) value = hold.update(true, t);
    expect(value).toBe(1);
  });

  it("drains quickly once the condition breaks", () => {
    const hold = new HoldProgress(1000, 200);
    for (let t = 0; t <= 500; t += STEP) hold.update(true, t);
    let value = 1;
    for (let t = 500; t <= 700; t += STEP) value = hold.update(false, t);
    expect(value).toBe(0);
  });

  it("never fills in one go after a stalled frame", () => {
    const hold = new HoldProgress(1000);
    hold.update(true, 0);
    expect(hold.update(true, 5000)).toBeCloseTo(0.1, 6);
  });
});

describe("SteadyWindow", () => {
  it("is steady only once the window is covered with close readings", () => {
    const still = new SteadyWindow(gap);
    expect(still.update(0, 0)).toBe(false);
    let steady = false;
    for (let t = STEP; t < 400; t += STEP) steady = still.update(STILL_ANGLE / 3, t);
    expect(steady).toBe(true);
  });

  it("is not steady while the reading wobbles", () => {
    const shaky = new SteadyWindow(gap);
    let steady = true;
    for (let t = 0; t < 800; t += STEP) steady = shaky.update(Math.sin(t / 40) * STILL_ANGLE * 2, t);
    expect(steady).toBe(false);
  });

  it("still settles on a phone that reads only five times a second", () => {
    const slow = new SteadyWindow(gap);
    let steady = false;
    for (let t = 0; t <= 1000; t += 200) steady = slow.update(0.3, t);
    expect(steady).toBe(true);
  });
});
