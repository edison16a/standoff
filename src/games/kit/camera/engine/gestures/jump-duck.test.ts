import { describe, expect, it } from "vitest";
import { baselineFor, bodiesFrom } from "../sequence";
import type { PoseSpec } from "../synthetic";
import { MOVES, type PoseKey } from "../timeline";
import { DuckDetector } from "./duck";
import { JumpDetector } from "./jump";
import { StandingReference } from "./reference";

/** Feeds a movement to the jump and duck detectors against a baseline taken standing in `base`. */
function watch(keys: PoseKey[], base: PoseSpec = {}, options: { fps?: number; smooth?: boolean } = {}) {
  const reference = new StandingReference(baselineFor(base));
  const jump = new JumpDetector();
  const duck = new DuckDetector();
  return bodiesFrom(keys, options).map((body) => ({ time: body.time, jump: jump.update(body, reference), duck: duck.update(body, reference) }));
}

describe("jumping", () => {
  it("starts once and lands once", () => {
    const frames = watch(MOVES.jump());
    expect(frames.filter((f) => f.jump.started)).toHaveLength(1);
    expect(frames.filter((f) => f.jump.landed)).toHaveLength(1);
    expect(frames.find((f) => f.jump.started)!.jump.confidence).toBeGreaterThan(0.3);
    expect(frames.some((f) => f.duck.active)).toBe(false);
  });

  it("works for a tall player near the camera and a short one far away", () => {
    for (const base of [{ height: 0.88 }, { height: 0.32, x: 0.3 }]) {
      const frames = watch(MOVES.jump(base), base);
      expect(frames.filter((f) => f.jump.started)).toHaveLength(1);
    }
  });

  it("is seen within 150 ms, through the smoothing, at 30 frames a second", () => {
    const frames = watch(MOVES.jump(), {}, { smooth: true });
    expect(frames.find((f) => f.jump.started)!.time).toBeLessThanOrEqual(150);
  });

  it("is still caught at 8 frames a second", () => {
    expect(watch(MOVES.jump(), {}, { fps: 8 }).filter((f) => f.jump.started)).toHaveLength(1);
  });

  it("ignores standing on tiptoe and raising both arms", () => {
    const tiptoe: PoseKey[] = [{ at: 0, pose: {} }, { at: 300, pose: { lift: 0.04 } }, { at: 800, pose: { lift: 0.04 } }];
    const arms: PoseKey[] = [{ at: 0, pose: {} }, { at: 250, pose: { left: { raise: 1 }, right: { raise: 1 } } }];
    expect(watch(tiptoe).some((f) => f.jump.active)).toBe(false);
    expect(watch(arms).some((f) => f.jump.active)).toBe(false);
  });

  it("ignores stepping back from a high camera, which lifts the body in the picture", () => {
    const back: PoseKey[] = [{ at: 0, pose: {} }, { at: 400, pose: { height: 0.5, floor: 0.8 } }];
    expect(watch(back).some((f) => f.jump.active)).toBe(false);
  });
});

describe("ducking", () => {
  it("goes down once and stands once", () => {
    const frames = watch(MOVES.duck());
    expect(frames.filter((f) => f.duck.started)).toHaveLength(1);
    expect(frames.filter((f) => f.duck.ended)).toHaveLength(1);
    expect(frames.some((f) => f.jump.active)).toBe(false);
  });

  it("counts a bow from the hips as well as a squat", () => {
    const bow: PoseKey[] = [{ at: 0, pose: {} }, { at: 250, pose: { bow: 0.75 } }];
    const squat: PoseKey[] = [{ at: 0, pose: {} }, { at: 250, pose: { crouch: 0.6 } }];
    expect(watch(bow).some((f) => f.duck.active)).toBe(true);
    expect(watch(squat).some((f) => f.duck.active)).toBe(true);
  });

  it("works for tall and short players and on slow machines", () => {
    expect(watch(MOVES.duck({ height: 0.85 }), { height: 0.85 }).filter((f) => f.duck.started)).toHaveLength(1);
    expect(watch(MOVES.duck({ height: 0.3 }), { height: 0.3 }).filter((f) => f.duck.started)).toHaveLength(1);
    expect(watch(MOVES.duck(), {}, { fps: 6 }).filter((f) => f.duck.started)).toHaveLength(1);
  });

  it("is seen within 150 ms through the smoothing", () => {
    const frames = watch(MOVES.duck(), {}, { smooth: true });
    expect(frames.find((f) => f.duck.started)!.time).toBeLessThanOrEqual(150);
  });

  it("ignores a small bob and a step toward a high camera", () => {
    const bob: PoseKey[] = [{ at: 0, pose: {} }, { at: 200, pose: { crouch: 0.15 } }, { at: 400, pose: {} }];
    const nearer: PoseKey[] = [{ at: 0, pose: {} }, { at: 500, pose: { height: 0.9, floor: 1.25 } }];
    expect(watch(bob).some((f) => f.duck.active)).toBe(false);
    expect(watch(nearer).some((f) => f.duck.active)).toBe(false);
  });
});

describe("the standing reference", () => {
  it("follows a neutral player slowly and holds still during a move", () => {
    const baseline = baselineFor({});
    const reference = new StandingReference(baseline);
    const lower = bodiesFrom([{ at: 0, pose: { floor: 0.97 } }], { tail: 0 })[0]!;
    reference.follow(lower, false, 1000, 2000, 0.12);
    expect(reference.hipY).toBe(baseline.hipY);
    reference.follow(lower, true, 2000, 2000, 0.12);
    const moved = (reference.hipY - baseline.hipY) / (lower.hips.y - baseline.hipY);
    expect(moved).toBeCloseTo(1 - Math.exp(-1), 3);
  });
});
