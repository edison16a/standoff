import { describe, expect, it } from "vitest";
import { MOVES, type PoseKey, type PoseSpec } from "@/games/kit/camera";
import { eventsOf, readMoves } from "@/games/kit/camera/engine/sequence";
import { JUMP_TUNING } from "./jump-tuning";

/** When each jump starts, in milliseconds, for a waist up movement watched at 30 frames a second through the kit's smoothing. */
function starts(keys: PoseKey[], base: PoseSpec = {}): number[] {
  return eventsOf(readMoves(keys, base, { smooth: true, tuning: JUMP_TUNING }), "jump").map((event) => event.time);
}

/** A quick hop, like a rope skip: 12 cm up and down in under half a second. */
const hop = (base: PoseSpec = {}): PoseKey[] => [
  { at: 0, pose: base },
  { at: 130, pose: { ...base, lift: 0.12 } },
  { at: 260, pose: { ...base, lift: 0.12 } },
  { at: 400, pose: base },
];

describe("reading a jump for Cube Game", () => {
  it("sees a jump within 120 ms of the take off", () => {
    const [first] = starts(MOVES.jump());
    expect(first).toBeLessThanOrEqual(120);
  });

  it("keeps up when the camera gives only 15 frames a second", () => {
    expect(eventsOf(readMoves(MOVES.jump(), {}, { smooth: true, fps: 15, tuning: JUMP_TUNING }), "jump")[0]?.time).toBeLessThanOrEqual(140);
  });

  it("sees a small quick hop too, for fast rhythm parts", () => {
    expect(starts(hop())).toHaveLength(1);
    expect(starts(hop())[0]).toBeLessThanOrEqual(140);
  });

  it("counts a small jump, about a third of a full one", () => {
    const small = (base: PoseSpec = {}): PoseKey[] => hop(base).map((k) => ({ ...k, pose: { ...k.pose, lift: k.pose.lift ? 0.06 : 0 } }));
    expect(starts(small())).toHaveLength(1);
    expect(starts(small({ height: 2.4 }), { height: 2.4 })).toHaveLength(1);
  });

  it("ignores bobbing to the beat, nodding and the bend of a landing", () => {
    const bob: PoseKey[] = Array.from({ length: 16 }, (_, i) => ({ at: i * 160, pose: { crouch: i % 2 ? 0.2 : 0, lift: i % 4 === 2 ? 0.03 : 0 } }));
    const nod: PoseKey[] = Array.from({ length: 12 }, (_, i) => ({ at: i * 200, pose: { nod: i % 2 ? -0.8 : 0.8 } }));
    expect(starts(bob)).toHaveLength(0);
    expect(starts(nod)).toHaveLength(0);
    const landing: PoseKey[] = [...MOVES.jump(), { at: 700, pose: { crouch: 0.5 } }, { at: 950, pose: {} }];
    expect(starts(landing)).toHaveLength(1);
  });

  it("reads one jump once, never twice", () => {
    expect(starts(MOVES.jump())).toHaveLength(1);
    expect(starts([...hop(), ...hop().map((k) => ({ ...k, at: k.at + 500 }))])).toHaveLength(2);
  });

  it("ignores tiptoes, a quick bob, a bow and a slow stretch up", () => {
    expect(starts([{ at: 0, pose: {} }, { at: 300, pose: { lift: 0.04 } }, { at: 800, pose: { lift: 0.04 } }])).toHaveLength(0);
    expect(starts([{ at: 0, pose: {} }, { at: 120, pose: { lift: 0.04 } }, { at: 240, pose: {} }])).toHaveLength(0);
    expect(starts([{ at: 0, pose: {} }, { at: 1500, pose: { lift: 0.12 } }, { at: 2000, pose: { lift: 0.12 } }])).toHaveLength(0);
    expect(starts([{ at: 0, pose: {} }, { at: 200, pose: { bow: 0.2 } }, { at: 500, pose: {} }])).toHaveLength(0);
  });

  it("works for a small player far back and a tall one close up", () => {
    for (const base of [{ height: 0.9, x: 0.3 }, { height: 2.4 }]) expect(starts(MOVES.jump(base), base)).toHaveLength(1);
  });
});
