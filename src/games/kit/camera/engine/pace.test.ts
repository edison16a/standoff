import { describe, expect, it } from "vitest";
import { PaceGuard, RateMeter } from "./pace";
import { blendPoses, poseAt, timelineLength } from "./timeline";

describe("watching the model's pace", () => {
  it("ignores the slow first frames while the GPU warms up", () => {
    const guard = new PaceGuard({ warmupFrames: 10, windowFrames: 20, budgetMs: 50 });
    const verdicts = [...Array(10).fill(400), ...Array(20).fill(20)].map((ms) => guard.record(ms));
    expect(verdicts.some(Boolean)).toBe(false);
  });

  it("says so once when the model is too slow on average", () => {
    const guard = new PaceGuard({ warmupFrames: 5, windowFrames: 20, budgetMs: 50 });
    const verdicts = Array.from({ length: 80 }, () => guard.record(70));
    expect(verdicts.filter(Boolean)).toHaveLength(1);
    expect(verdicts.indexOf(true)).toBe(24);
  });

  it("decides early when the model is several times too slow", () => {
    const guard = new PaceGuard({ warmupFrames: 5, windowFrames: 30, budgetMs: 50 });
    const verdicts = Array.from({ length: 40 }, () => guard.record(300));
    expect(verdicts.indexOf(true)).toBe(9);
    expect(verdicts.filter(Boolean)).toHaveLength(1);
  });

  it("lets a hopelessly slow machine go on the first frame after the warm up", () => {
    const guard = new PaceGuard({ warmupFrames: 3, windowFrames: 30, budgetMs: 50 });
    const verdicts = Array.from({ length: 10 }, () => guard.record(4000));
    expect(verdicts.indexOf(true)).toBe(3);
  });

  it("counts frames per second and the mean inference time", () => {
    const meter = new RateMeter();
    let ready = false;
    for (let t = 0; t <= 1000; t += 50) ready = meter.tick(t, 12) || ready;
    expect(ready).toBe(true);
    expect(meter.fps).toBeCloseTo(21, 0);
    expect(meter.inferenceMs).toBeCloseTo(12, 6);
  });
});

describe("scripted pose timelines", () => {
  const keys = [
    { at: 0, pose: { x: 0.2, left: { guard: 1 } } },
    { at: 100, pose: { x: 0.4, lift: 0.2 } },
  ];

  it("blends numbers between keys and holds at the ends", () => {
    expect(poseAt(keys, -50).x).toBeCloseTo(0.2, 6);
    expect(poseAt(keys, 50).x).toBeCloseTo(0.3, 6);
    expect(poseAt(keys, 50).lift).toBeCloseTo(0.1, 6);
    expect(poseAt(keys, 50).left!.guard).toBeCloseTo(0.5, 6);
    expect(poseAt(keys, 500).x).toBeCloseTo(0.4, 6);
    expect(timelineLength(keys)).toBe(100);
  });

  it("fills missing numbers with standing still", () => {
    const blended = blendPoses({}, { crouch: 1 }, 0.25);
    expect(blended.crouch).toBeCloseTo(0.25, 6);
    expect(blended.x).toBe(0.5);
    expect(poseAt([], 10, { x: 0.3 }).x).toBe(0.3);
  });
});
