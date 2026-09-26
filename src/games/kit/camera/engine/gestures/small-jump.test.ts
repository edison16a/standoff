import { describe, expect, it } from "vitest";
import { deriveBody } from "../body";
import { LM } from "../landmarks";
import { baselineFor, readMoves, type SequenceOptions } from "../sequence";
import { syntheticPose, type PoseSpec } from "../synthetic";
import type { PoseKey } from "../timeline";
import { HeadLine } from "./head-line";
import { SMALL_JUMP } from "./options";

/** Jumps and ducks a game on the small jump preset hears, watched through the kit's smoothing. */
function kinds(keys: PoseKey[], base: PoseSpec = {}, options: SequenceOptions = {}): string[] {
  const frames = readMoves(keys, base, { smooth: true, tuning: SMALL_JUMP, ...options });
  return frames.flatMap((f) => f.events.map((e) => e.type)).filter((type) => type === "jump" || type === "duck");
}

/** Up by `lift` metres and back down. A full jump in the kit's tests is 0.2, so 0.06 is under a third of it. */
const hop = (lift: number, base: PoseSpec = {}): PoseKey[] => [
  { at: 0, pose: base },
  { at: 130, pose: { ...base, lift } },
  { at: 260, pose: { ...base, lift } },
  { at: 400, pose: base },
];

/** A real jump: a dip to push off, the flight, then the knees bending by `crouch` to land. */
const realJump = (crouch: number): PoseKey[] => [
  { at: 0, pose: {} },
  { at: 120, pose: { crouch: 0.15 } },
  { at: 260, pose: { lift: 0.22 } },
  { at: 420, pose: { lift: 0.2 } },
  { at: 540, pose: { crouch: 0.1 } },
  { at: 640, pose: { crouch } },
  { at: 900, pose: {} },
];

const repeat = (count: number, everyMs: number, pose: (i: number) => PoseSpec): PoseKey[] =>
  Array.from({ length: count }, (_, i) => ({ at: i * everyMs, pose: pose(i) }));

describe("the small jump preset", () => {
  it("counts a small hop of about a third of a full jump, once", () => {
    expect(kinds(hop(0.06))).toEqual(["jump"]);
    expect(kinds([...hop(0.06), ...hop(0.06).map((k) => ({ ...k, at: k.at + 600 }))])).toEqual(["jump", "jump"]);
  });

  it("counts it near and far, and at 15 frames a second", () => {
    for (const base of [{ height: 0.9, x: 0.3 }, { height: 2.4 }]) expect(kinds(hop(0.06, base), base)).toEqual(["jump"]);
    expect(kinds(hop(0.06), {}, { fps: 15 })).toEqual(["jump"]);
  });

  it("still reads a full jump once, and the bend of its landing is never a duck", () => {
    for (const crouch of [0.3, 0.45, 0.6]) expect(kinds(realJump(crouch))).toEqual(["jump"]);
  });

  it("ignores bobbing to the music, however long it goes on", () => {
    const bounce = repeat(16, 160, (i) => ({ crouch: i % 2 ? 0.2 : 0, lift: i % 4 === 2 ? 0.03 : 0 }));
    const knees = repeat(20, 250, (i) => ({ crouch: i % 2 ? 0.12 : 0 }));
    const quickBob = [{ at: 0, pose: {} }, { at: 120, pose: { lift: 0.04 } }, { at: 240, pose: {} }];
    for (const keys of [bounce, knees, quickBob]) expect(kinds(keys)).toEqual([]);
  });

  it("ignores nodding, a chin lift, a shrug, tiptoes and a slow stretch", () => {
    const nod = repeat(12, 200, (i) => ({ nod: i % 2 ? -0.8 : 0.8 }));
    const bows = repeat(10, 200, (i) => ({ bow: i % 2 ? 0.12 : 0 }));
    const shrug = [{ at: 0, pose: {} }, { at: 120, pose: { shrug: 0.08 } }, { at: 400, pose: {} }];
    const tiptoe = [{ at: 0, pose: {} }, { at: 300, pose: { lift: 0.04 } }, { at: 800, pose: { lift: 0.04 } }];
    const stretch = [{ at: 0, pose: {} }, { at: 1500, pose: { lift: 0.1 } }, { at: 2000, pose: { lift: 0.1 } }];
    for (const keys of [nod, bows, shrug, tiptoe, stretch]) expect(kinds(keys)).toEqual([]);
  });

  it("leaves the kit default alone, so other games still need a bigger jump", () => {
    const frames = readMoves(hop(0.06), {}, { smooth: true });
    expect(frames.flatMap((f) => f.events).filter((e) => e.type === "jump")).toEqual([]);
  });
});

describe("lift: head and shoulders rising together", () => {
  const line = () => new HeadLine(baselineFor({}));
  const bodyOf = (spec: PoseSpec, keepShoulders = false) => {
    const pose = syntheticPose(spec);
    if (keepShoulders) {
      const rest = syntheticPose({});
      for (const i of [LM.leftShoulder, LM.rightShoulder]) pose.landmarks[i] = rest.landmarks[i]!;
    }
    return deriveBody(pose, 0, 16 / 9, null);
  };

  it("matches the rise for a jump", () => {
    const at = line().measure(bodyOf({ lift: 0.1 }));
    expect(at.lift).toBeGreaterThan(0.25);
    expect(at.lift).toBeCloseTo(at.rise, 2);
  });

  it("stays near zero when only the head goes up", () => {
    const at = line().measure(bodyOf({ lift: 0.1 }, true));
    expect(at.rise).toBeGreaterThan(0.25);
    expect(at.lift).toBeLessThan(0.02);
  });
});
