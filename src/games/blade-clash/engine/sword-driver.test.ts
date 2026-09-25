import { describe, expect, it } from "vitest";
import { GUARD, type SwordControl } from "./sword";
import { SwordDriver } from "./sword-driver";

const TICK = 1000 / 60;
const timing = { outMs: 150, returnMs: 400 };
const hold = (yaw: number, pitch: number, reach = 0): SwordControl => ({ yaw, pitch, roll: 0, reach });

/** Steps the driver until `until` ms, returning the biggest jump in yaw or pitch between two steps. */
function run(driver: SwordDriver, from: number, until: number): number {
  let biggest = 0;
  for (let t = from + TICK; t <= until + 1e-6; t += TICK) {
    const before = driver.control;
    const now = driver.step(TICK, t);
    biggest = Math.max(biggest, Math.abs(now.yaw - before.yaw), Math.abs(now.pitch - before.pitch));
  }
  return biggest;
}

describe("SwordDriver", () => {
  it("follows the phone closely, smoothing out the steps between readings", () => {
    const driver = new SwordDriver(() => timing);
    driver.setTarget(hold(1, 0.2));
    const first = driver.step(TICK, TICK);
    expect(first.yaw).toBeGreaterThan(0.12);
    expect(first.yaw).toBeLessThan(1);
    run(driver, TICK, 200);
    expect(driver.control.yaw).toBeCloseTo(1, 2);
  });

  it("reports how fast the hold is turning", () => {
    const driver = new SwordDriver(() => timing);
    driver.reset(hold(0, 0));
    driver.setTarget(hold(1, 0));
    driver.step(TICK, TICK);
    expect(driver.turnRate.yaw).toBeGreaterThan(10);
    expect(driver.turnRate.pitch).toBeCloseTo(0);
  });

  it("ignores the phone while a clash throws the sword, then eases back into the hand", () => {
    const driver = new SwordDriver(() => timing);
    driver.reset(hold(0, 0.3, 1));
    driver.knockBack({ yaw: -0.6, pitch: 0.2 }, 0);
    driver.setTarget(hold(0.8, -0.2));
    run(driver, 0, 140);
    // Thrown well away from the hand and the phone, arm pulled in.
    expect(driver.control.yaw).toBeLessThan(-0.45);
    expect(driver.control.reach).toBeLessThan(0.2);
    expect(driver.isFree(140)).toBe(false);
    expect(driver.knockedAt(140)).toBe(1);
    const jump = run(driver, 140, 700);
    expect(driver.control.yaw).toBeCloseTo(0.8, 2);
    expect(driver.control.pitch).toBeCloseTo(-0.2, 2);
    expect(driver.knockedAt(700)).toBe(0);
    expect(driver.isFree(700)).toBe(true);
    // Never a jump: the whole way back moves a little each step.
    expect(jump).toBeLessThan(0.12);
  });

  it("can be thrown from where the blades met rather than from where the tick left it", () => {
    const driver = new SwordDriver(() => timing);
    driver.reset(hold(1, 0));
    driver.knockBack({ yaw: 0.5, pitch: 0 }, 0, hold(0.4, 0));
    expect(driver.control.yaw).toBeCloseTo(0.4);
  });

  it("resets straight into a hold", () => {
    const driver = new SwordDriver(() => timing);
    driver.setTarget(hold(1, 1));
    driver.knockBack({ yaw: 1, pitch: 0 }, 0);
    driver.reset();
    expect(driver.control).toEqual(GUARD);
    expect(driver.before).toEqual(GUARD);
    expect(driver.knockedAt(10)).toBe(0);
  });
});
