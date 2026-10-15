import { describe, expect, it } from "vitest";
import type { Athlete } from "../types";
import { CLOSEOUT_CARRY, closeoutLeap, PASS_BY } from "./closeout";

const runner = (vx: number, vz: number) => ({ x: 0, z: 5, vx, vz }) as Athlete;

/** How near the straight line of his flight comes to a point. */
function passes(a: Athlete, p: { x: number; z: number }): number {
  const s = Math.hypot(a.vx, a.vz);
  return Math.abs((p.x - a.x) * (-a.vz / s) + (p.z - a.z) * (a.vx / s));
}

describe("the closeout leap", () => {
  it("brakes into the leap", () => {
    const a = runner(0, 4);
    closeoutLeap(a, null);
    expect(Math.hypot(a.vx, a.vz)).toBeCloseTo(4 * CLOSEOUT_CARRY);
  });

  it("turns a run straight at the shooter so it flies by his shoulder", () => {
    const a = runner(0.1, 4);
    const shooter = { x: 0, z: 8 };
    closeoutLeap(a, shooter);
    expect(passes(a, shooter)).toBeCloseTo(PASS_BY, 1);
    // Still going his way, and no faster.
    expect(a.vz).toBeGreaterThan(0);
    expect(Math.hypot(a.vx, a.vz)).toBeCloseTo(Math.hypot(0.1, 4) * CLOSEOUT_CARRY);
  });

  it("leaves a run that already clears him alone", () => {
    const a = runner(0, 4);
    closeoutLeap(a, { x: 1.5, z: 8 });
    expect(a.vx).toBe(0);
  });
});
