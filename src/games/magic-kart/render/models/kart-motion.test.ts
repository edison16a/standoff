import { describe, expect, it } from "vitest";
import { SuspensionMotion, type MotionInput } from "./kart-motion";

const base: MotionInput = { dt: 1 / 60, speed: 0, yawRate: 0, vy: 0, airborne: false, rough: 0, time: 0 };

function run(motion: SuspensionMotion, seconds: number, input: Partial<MotionInput>, start = 0): number {
  const frames = Math.round(seconds * 60);
  for (let f = 0; f < frames; f++) motion.step({ ...base, ...input, time: start + f / 60 });
  return start + seconds;
}

describe("SuspensionMotion", () => {
  it("stays level standing still", () => {
    const m = new SuspensionMotion();
    run(m, 2, {});
    expect(Math.abs(m.roll)).toBeLessThan(1e-6);
    expect(Math.abs(m.pitch)).toBeLessThan(1e-6);
    expect(Math.abs(m.heave)).toBeLessThan(1e-6);
  });

  it("rolls toward the outside of a bend, and the other way in the other bend", () => {
    const left = new SuspensionMotion();
    run(left, 2, { speed: 20, yawRate: 0.6 });
    expect(left.roll).toBeGreaterThan(0.03);
    expect(left.roll).toBeLessThanOrEqual(0.12);
    const right = new SuspensionMotion();
    run(right, 2, { speed: 20, yawRate: -0.6 });
    expect(right.roll).toBeLessThan(-0.03);
  });

  it("dips the nose under braking and squats under power", () => {
    const m = new SuspensionMotion();
    let t = run(m, 1, { speed: 20 });
    // Losing 15 m/s a second.
    for (let f = 0; f < 20; f++) m.step({ ...base, speed: 20 - (f + 1) * 0.25, time: t + f / 60 });
    expect(m.pitch).toBeGreaterThan(0.02);
    const go = new SuspensionMotion();
    t = 0;
    for (let f = 0; f < 20; f++) go.step({ ...base, speed: (f + 1) * 0.2, time: t + f / 60 });
    expect(go.pitch).toBeLessThan(-0.01);
  });

  it("compresses on a hard landing, then settles back", () => {
    const m = new SuspensionMotion();
    let t = run(m, 0.5, { airborne: true, vy: -9, speed: 15 });
    m.step({ ...base, speed: 15, time: t });
    let lowest = 0;
    for (let f = 0; f < 30; f++) {
      m.step({ ...base, speed: 15, time: t + f / 60 });
      lowest = Math.min(lowest, m.heave);
    }
    expect(lowest).toBeLessThan(-0.03);
    t = run(m, 3, { speed: 15 }, t + 0.5);
    expect(Math.abs(m.heave)).toBeLessThan(0.02);
  });
});
