import { describe, expect, it } from "vitest";
import type { Body } from "./body";
import { BaselineCollector, type CalibrationProgress } from "./calibration";
import { bodiesFrom } from "./sequence";
import { spotsFor } from "./spots";
import type { PoseSpec } from "./synthetic";
import type { PoseKey } from "./timeline";

const [left, right] = spotsFor(2);
const still = (pose: PoseSpec, ms = 2500): PoseKey[] => [{ at: 0, pose }, { at: ms, pose }];

function run(collector: BaselineCollector, bodies: (Body | null)[], start = 0): CalibrationProgress[] {
  return bodies.map((body, i) => collector.update(body, body?.time ?? start + i * 33));
}

describe("calibrating a player's baseline", () => {
  it("fills the ring while the player stands still in their spot, then gives their baseline", () => {
    const collector = new BaselineCollector(left!);
    const steps = run(collector, bodiesFrom(still({ x: 0.28 })));
    const done = steps.findIndex((step) => step.phase === "done");
    expect(steps[1]!.phase).toBe("hold");
    expect(done * 33).toBeGreaterThanOrEqual(1500);
    expect(done * 33).toBeLessThan(1700);
    const baseline = steps[done]!.baseline!;
    expect(baseline.slot).toBe(1);
    expect(baseline.centerX).toBeCloseTo(0.28, 3);
    expect(baseline.headY).toBeLessThan(baseline.shoulderY);
    expect(baseline.shoulderY).toBeLessThan(baseline.hipY);
    expect(baseline.armLength).toBeGreaterThan(0.9);
    expect(baseline.armLength).toBeLessThan(1.3);
    expect(Math.abs(baseline.headOffset)).toBeLessThan(0.02);
  });

  it("says which way to move when the player is outside their spot", () => {
    expect(new BaselineCollector(left!).update(bodiesFrom(still({ x: 0.6 }))[0]!, 0).issue).toBe("step-left");
    expect(new BaselineCollector(right!).update(bodiesFrom(still({ x: 0.4 }))[0]!, 0).issue).toBe("step-right");
    expect(new BaselineCollector(left!).update(null, 0).issue).toBe("missing");
  });

  it("asks the player to come nearer or step back", () => {
    const [solo] = spotsFor(1);
    expect(new BaselineCollector(solo!).update(bodiesFrom(still({ height: 0.25 }))[0]!, 0).issue).toBe("closer");
    expect(new BaselineCollector(solo!).update(bodiesFrom(still({ height: 1.7, floor: 1.4 }))[0]!, 0).issue).toBe("back");
  });

  it("asks for the feet in view when a game needs the whole body", () => {
    const [solo] = spotsFor(1);
    const cropped = bodiesFrom(still({ floor: 1.25 }))[0]!;
    const collector = new BaselineCollector(solo!, { rules: { needs: "full", minScale: 0.09, maxScale: 0.4, minConfidence: 0.6 } });
    expect(collector.update(cropped, 0).issue).toBe("legs");
    expect(new BaselineCollector(solo!).update(cropped, 0).issue).toBeNull();
  });

  it("drains the ring when the player moves, and fills again when they settle", () => {
    const collector = new BaselineCollector(left!);
    run(collector, bodiesFrom(still({ x: 0.28 }, 900)));
    const sway: PoseKey[] = [
      { at: 0, pose: { x: 0.28 } },
      { at: 150, pose: { x: 0.34 } },
      { at: 300, pose: { x: 0.24 } },
      { at: 450, pose: { x: 0.28 } },
    ];
    const swaying = run(collector, bodiesFrom(sway, { start: 1000, tail: 0 }));
    expect(swaying.some((step) => step.issue === "moving")).toBe(true);
    const after = swaying[swaying.length - 1]!;
    expect(after.progress).toBeLessThan(0.6);
    const settled = run(collector, bodiesFrom(still({ x: 0.28 }), { start: 1500 }));
    expect(settled.some((step) => step.phase === "done")).toBe(true);
  });

  it("still finishes on a slow machine that tracks five frames a second", () => {
    const collector = new BaselineCollector(right!);
    const steps = run(collector, bodiesFrom(still({ x: 0.72 }), { fps: 5 }));
    const done = steps.find((step) => step.phase === "done");
    expect(done?.baseline?.centerX).toBeCloseTo(0.72, 3);
  });

  it("still notices a player moving on a machine that tracks one frame a second", () => {
    const collector = new BaselineCollector(left!);
    const sway: PoseKey[] = [0, 1000, 2000, 3000, 4000, 5000].map((at, i) => ({ at, pose: { x: 0.28 + (i % 2 ? 0.04 : -0.04) } }));
    const steps = run(collector, bodiesFrom(sway, { fps: 1, tail: 0 }));
    expect(steps.some((step) => step.phase === "done")).toBe(false);
    expect(steps.slice(1).every((step) => step.issue === "moving")).toBe(true);
  });

  it("measures tall and short players in their own torso lengths", () => {
    const [solo] = spotsFor(1);
    const near = run(new BaselineCollector(solo!), bodiesFrom(still({ height: 0.85 }))).find((s) => s.baseline)!.baseline!;
    const far = run(new BaselineCollector(solo!), bodiesFrom(still({ height: 0.4 }))).find((s) => s.baseline)!.baseline!;
    expect(near.scale / far.scale).toBeCloseTo(0.85 / 0.4, 1);
    expect(near.armLength).toBeCloseTo(far.armLength, 2);
  });
});
