import { describe, expect, it } from "vitest";
import { deriveBody, type Body } from "./body";
import { BaselineCollector, type CalibrationProgress } from "./calibration";
import { LM, type Pose } from "./landmarks";
import { bodiesFrom } from "./sequence";
import { spotsFor } from "./spots";
import { syntheticPose, type PoseSpec } from "./synthetic";
import type { PoseKey } from "./timeline";

const [left, right] = spotsFor(2);
/** Two players share the picture, so they stand a little further back than one alone. */
const PAIR = { height: 1.3 };
const still = (pose: PoseSpec, ms = 2500): PoseKey[] => [{ at: 0, pose }, { at: ms, pose }];

function run(collector: BaselineCollector, bodies: (Body | null)[], start = 0): CalibrationProgress[] {
  return bodies.map((body, i) => collector.update(body, body?.time ?? start + i * 33));
}

describe("calibrating a player's head line", () => {
  it("fills the ring while the player stands still in their spot, waist up, then gives their head line", () => {
    const collector = new BaselineCollector(left!);
    const steps = run(collector, bodiesFrom(still({ ...PAIR, x: 0.28 })));
    const done = steps.findIndex((step) => step.phase === "done");
    expect(steps[1]!.phase).toBe("hold");
    expect(done * 33).toBeGreaterThanOrEqual(1500);
    expect(done * 33).toBeLessThan(1700);
    const baseline = steps[done]!.baseline!;
    expect(baseline.slot).toBe(1);
    expect(baseline.centerX).toBeCloseTo(0.28, 3);
    expect(baseline.headY).toBeLessThan(baseline.shoulderY);
    expect(baseline.shoulderWidth).toBeGreaterThan(0.2);
    expect(baseline.armLength).toBeGreaterThan(0.9);
    expect(baseline.armLength).toBeLessThan(1.3);
    expect(Math.abs(baseline.headOffset)).toBeLessThan(0.02);
  });

  it("needs nothing below the shoulders: no hips, knees or feet", () => {
    const [solo] = spotsFor(1);
    const pose = syntheticPose({}, 16 / 9);
    const upper: Pose = {
      landmarks: pose.landmarks.map((p, i) => (i >= LM.leftHip ? { x: 0, y: 0, z: 0, visibility: 0 } : p)),
      world: pose.world.map((p, i) => (i >= LM.leftHip ? { x: 0, y: 0, z: 0, visibility: 0 } : p)),
    };
    const collector = new BaselineCollector(solo!);
    let result: CalibrationProgress | null = null;
    let previous: Body | null = null;
    for (let t = 0; t <= 2000; t += 33) {
      previous = deriveBody(upper, t, 16 / 9, previous);
      result = collector.update(previous, t);
    }
    expect(result!.phase).toBe("done");
    expect(result!.baseline!.headY).toBeCloseTo(previous!.head.y, 6);
  });

  it("says which way to move when the player is outside their spot", () => {
    expect(new BaselineCollector(left!).update(bodiesFrom(still({ x: 0.6 }))[0]!, 0).issue).toBe("step-left");
    expect(new BaselineCollector(right!).update(bodiesFrom(still({ x: 0.4 }))[0]!, 0).issue).toBe("step-right");
    expect(new BaselineCollector(left!).update(null, 0).issue).toBe("missing");
  });

  it("asks the player to come nearer, step back, or leave room above their head", () => {
    const [solo] = spotsFor(1);
    const issue = (pose: PoseSpec) => new BaselineCollector(solo!).update(bodiesFrom(still(pose))[0]!, 0).issue;
    expect(issue({ height: 0.25 })).toBe("closer");
    expect(issue({ height: 3.4 })).toBe("back");
    expect(issue({ head: 0.06 })).toBe("headroom");
    expect(issue({})).toBeNull();
    // A player far enough back to show their legs is fine too.
    expect(issue({ height: 0.8, legs: true })).toBeNull();
  });

  it("drains the ring when the player moves, and fills again when they settle", () => {
    const collector = new BaselineCollector(left!);
    run(collector, bodiesFrom(still({ ...PAIR, x: 0.28 }, 900)));
    const sway: PoseKey[] = [
      { at: 0, pose: { ...PAIR, x: 0.28 } },
      { at: 150, pose: { ...PAIR, x: 0.34 } },
      { at: 300, pose: { ...PAIR, x: 0.24 } },
      { at: 450, pose: { ...PAIR, x: 0.28 } },
    ];
    const swaying = run(collector, bodiesFrom(sway, { start: 1000, tail: 0 }));
    expect(swaying.some((step) => step.issue === "moving")).toBe(true);
    const after = swaying[swaying.length - 1]!;
    expect(after.progress).toBeLessThan(0.6);
    const settled = run(collector, bodiesFrom(still({ ...PAIR, x: 0.28 }), { start: 1500 }));
    expect(settled.some((step) => step.phase === "done")).toBe(true);
  });

  it("still finishes on a slow machine that tracks five frames a second", () => {
    const collector = new BaselineCollector(right!);
    const steps = run(collector, bodiesFrom(still({ ...PAIR, x: 0.72 }), { fps: 5 }));
    const done = steps.find((step) => step.phase === "done");
    expect(done?.baseline?.centerX).toBeCloseTo(0.72, 3);
  });

  it("still notices a player moving on a machine that tracks one frame a second", () => {
    const collector = new BaselineCollector(left!);
    const sway: PoseKey[] = [0, 1000, 2000, 3000, 4000, 5000].map((at, i) => ({ at, pose: { ...PAIR, x: 0.28 + (i % 2 ? 0.04 : -0.04) } }));
    const steps = run(collector, bodiesFrom(sway, { fps: 1, tail: 0 }));
    expect(steps.some((step) => step.phase === "done")).toBe(false);
    expect(steps.slice(1).every((step) => step.issue === "moving")).toBe(true);
  });

  it("measures near and far players in their own shoulder widths", () => {
    const [solo] = spotsFor(1);
    const near = run(new BaselineCollector(solo!), bodiesFrom(still({ height: 2.4 }))).find((s) => s.baseline)!.baseline!;
    const far = run(new BaselineCollector(solo!), bodiesFrom(still({ height: 0.8 }))).find((s) => s.baseline)!.baseline!;
    expect(near.shoulderWidth / far.shoulderWidth).toBeCloseTo(3, 1);
    // Close up the hands hang below the picture, so the arm takes the usual length.
    expect(near.armLength).toBeCloseTo(1.1, 2);
    expect(far.armLength).toBeCloseTo(1.1, 0);
  });
});
