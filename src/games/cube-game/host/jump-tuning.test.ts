import { describe, expect, it } from "vitest";
import { MOVES, type PoseKey, type PoseSpec } from "@/games/kit/camera";
import { DEFAULT_JUMP, JumpDetector } from "@/games/kit/camera/engine/gestures/jump";
import { StandingReference } from "@/games/kit/camera/engine/gestures/reference";
import { baselineFor, bodiesFrom } from "@/games/kit/camera/engine/sequence";
import { JUMP_TUNING } from "./jump-tuning";

/** When each jump starts, in milliseconds, for a movement watched at 30 frames a second through the kit's smoothing. */
function starts(keys: PoseKey[], base: PoseSpec = {}): number[] {
  const reference = new StandingReference(baselineFor(base));
  const detector = new JumpDetector({ ...DEFAULT_JUMP, ...JUMP_TUNING.jump });
  return bodiesFrom(keys, { smooth: true })
    .filter((body) => detector.update(body, reference).started)
    .map((body) => body.time);
}

/** A quick hop, like a rope skip: 12 cm up and down in under half a second. */
const hop = (base: PoseSpec = {}): PoseKey[] => [
  { at: 0, pose: base },
  { at: 130, pose: { ...base, lift: 0.12 } },
  { at: 260, pose: { ...base, lift: 0.12 } },
  { at: 400, pose: base },
];

describe("reading a jump for Cube Game", () => {
  it("sees a jump well within 150 ms of the take off", () => {
    const [first] = starts(MOVES.jump());
    expect(first).toBeLessThanOrEqual(120);
  });

  it("sees a small quick hop too, for fast rhythm parts", () => {
    expect(starts(hop())).toHaveLength(1);
    expect(starts(hop())[0]).toBeLessThanOrEqual(130);
  });

  it("reads one jump once, never twice", () => {
    expect(starts(MOVES.jump())).toHaveLength(1);
    expect(starts([...hop(), ...hop().map((k) => ({ ...k, at: k.at + 500 }))])).toHaveLength(2);
  });

  it("ignores tiptoes and a bob of the head", () => {
    expect(starts([{ at: 0, pose: {} }, { at: 300, pose: { lift: 0.04 } }, { at: 800, pose: { lift: 0.04 } }])).toHaveLength(0);
    expect(starts([{ at: 0, pose: {} }, { at: 200, pose: { bow: 0.2 } }, { at: 500, pose: {} }])).toHaveLength(0);
  });

  it("works for a small player far back and a tall one close up", () => {
    for (const base of [{ height: 0.4, x: 0.3 }, { height: 0.85 }]) expect(starts(MOVES.jump(base), base)).toHaveLength(1);
  });
});
