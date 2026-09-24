import { describe, expect, it } from "vitest";
import type { Hand } from "../body";
import { bodiesFrom } from "../sequence";
import type { PoseSpec } from "../synthetic";
import { MOVES, type PoseKey } from "../timeline";
import { PunchDetector, type Punch } from "./punch";

const GUARD: PoseSpec = { left: { guard: 1 }, right: { guard: 1 } };
const ARM = 1.1;

/** Every punch thrown in a movement, with the time it landed. */
function punches(keys: PoseKey[], options: { fps?: number; smooth?: boolean; base?: PoseSpec } = {}) {
  const detectors = { left: new PunchDetector("left"), right: new PunchDetector("right") };
  const out: (Punch & { time: number })[] = [];
  for (const body of bodiesFrom(keys, options)) {
    for (const hand of ["left", "right"] as Hand[]) {
      const punch = detectors[hand].update(body, ARM);
      if (punch) out.push({ ...punch, time: body.time });
    }
  }
  return out;
}

function throwing(hand: Hand, base: PoseSpec = {}): PoseSpec {
  return { ...base, ...GUARD, [hand]: { guard: 1, punch: 1 } };
}

describe("punching", () => {
  it("throws one straight punch with the right hand", () => {
    const thrown = punches(MOVES.punch({}, "right"));
    expect(thrown.map((p) => [p.hand, p.style])).toEqual([["right", "straight"]]);
    expect(thrown[0]!.power).toBeGreaterThan(0.3);
    expect(thrown[0]!.confidence).toBeGreaterThan(0.5);
  });

  it("tells the left hand from the right", () => {
    expect(punches(MOVES.punch({}, "left")).map((p) => p.hand)).toEqual(["left"]);
  });

  it("is seen within 150 ms, through the smoothing", () => {
    const thrown = punches(MOVES.punch({}, "right"), { smooth: true });
    expect(thrown).toHaveLength(1);
    expect(thrown[0]!.time).toBeLessThanOrEqual(150);
  });

  it("counts a combination, but not an arm held out", () => {
    const combo: PoseKey[] = [
      { at: 0, pose: { ...GUARD } },
      { at: 120, pose: throwing("left") },
      { at: 320, pose: { ...GUARD } },
      { at: 440, pose: throwing("right") },
      { at: 640, pose: { ...GUARD } },
      { at: 760, pose: throwing("left") },
      { at: 2000, pose: throwing("left") },
    ];
    expect(punches(combo).map((p) => p.hand)).toEqual(["left", "right", "left"]);
  });

  it("works near and far, and on a slow machine", () => {
    expect(punches(MOVES.punch({ height: 0.9 }, "right"))).toHaveLength(1);
    expect(punches(MOVES.punch({ height: 0.3, x: 0.3 }, "left"))).toHaveLength(1);
    expect(punches(MOVES.punch({}, "right"), { fps: 10 })).toHaveLength(1);
  });

  it("reads a hook swung across the face", () => {
    const hook: PoseKey[] = [
      { at: 0, pose: { ...GUARD } },
      { at: 300, pose: { ...GUARD, right: { guard: 1, wide: 1 } } },
      { at: 450, pose: { ...GUARD, right: { guard: 1, wide: 1 } } },
      { at: 580, pose: { ...GUARD, right: { guard: 1, wide: 1, hook: 1 } } },
      { at: 900, pose: { ...GUARD } },
    ];
    const thrown = punches(hook);
    expect(thrown.map((p) => [p.hand, p.style])).toEqual([["right", "hook"]]);
  });

  it("ignores a slow reach, dropping the hands and raising them overhead", () => {
    const reach: PoseKey[] = [{ at: 0, pose: { ...GUARD } }, { at: 1500, pose: throwing("right") }];
    const drop: PoseKey[] = [{ at: 0, pose: { ...GUARD } }, { at: 150, pose: {} }];
    const raise: PoseKey[] = [{ at: 0, pose: {} }, { at: 200, pose: { left: { raise: 1 }, right: { raise: 1 } } }];
    const cheer: PoseKey[] = [{ at: 0, pose: { ...GUARD } }, { at: 200, pose: { left: { raise: 1 }, right: { raise: 1 } } }];
    expect(punches(reach)).toHaveLength(0);
    expect(punches(drop)).toHaveLength(0);
    expect(punches(raise)).toHaveLength(0);
    expect(punches(cheer)).toHaveLength(0);
  });

  it("waits out the cooldown", () => {
    const detector = new PunchDetector("right", { ...new PunchDetector("right")["options"], cooldownMs: 1000, rearm: 0.99 });
    const bodies = bodiesFrom([...MOVES.punch({}, "right"), ...MOVES.punch({}, "right").map((k) => ({ ...k, at: k.at + 450 }))]);
    const thrown = bodies.map((body) => detector.update(body, ARM)).filter(Boolean);
    expect(thrown).toHaveLength(1);
  });
});
