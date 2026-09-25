import { describe, expect, it } from "vitest";
import type { PoseKey, PoseSpec } from "@/games/kit/camera";
import { readMoves } from "@/games/kit/camera/engine/sequence";
import { defenseFrom } from "./player-input";
import { SlipReader } from "./slip";

const GUARD: PoseSpec = { left: { guard: 1 }, right: { guard: 1 } };

/** A boxer in their guard, waist up, playing a movement: each frame's slip and duck as the fight would read them. */
function fight(keys: PoseKey[], base: PoseSpec = GUARD) {
  const reader = new SlipReader();
  return readMoves(keys, base, { smooth: true }).map(({ body, state }) => {
    const defense = defenseFrom(state, body, reader.update(state, body.time));
    return { time: body.time, slip: defense.slip, duck: defense.duck, amount: reader.amount };
  });
}

const at = (frames: ReturnType<typeof fight>, time: number) => frames.find((frame) => frame.time >= time)!;
const move = (pose: PoseSpec, base: PoseSpec = GUARD, hold = 600): PoseKey[] => [
  { at: 0, pose: base },
  { at: 500, pose: base },
  { at: 650, pose: { ...base, ...pose } },
  { at: 650 + hold, pose: { ...base, ...pose } },
  { at: 850 + hold, pose: base },
];

describe("slipping from the waist up", () => {
  it("slips when the whole upper body shifts sideways with the shoulders level", () => {
    const frames = fight(move({ x: 0.6 }));
    expect(at(frames, 400).slip).toBe(0);
    expect(at(frames, 800).slip).toBe(1);
    expect(at(frames, 800).amount).toBeGreaterThan(0.2);
    expect(frames[frames.length - 1]!.slip).toBe(0);
  });

  it("slips on a tilt at the waist too, either way", () => {
    expect(at(fight(move({ lean: 0.6 })), 900).slip).toBe(1);
    expect(at(fight(move({ lean: -0.6 })), 900).slip).toBe(-1);
  });

  it("works the same for a smaller player further back", () => {
    const base = { ...GUARD, height: 1.3, x: 0.35 };
    expect(at(fight(move({ x: 0.42 }, base), base), 800).slip).toBe(1);
  });

  it("never slips on a sway or on drifting slowly about the room", () => {
    expect(fight(move({ x: 0.54 })).every((frame) => frame.slip === 0)).toBe(true);
    const drift: PoseKey[] = [{ at: 0, pose: GUARD }, { at: 5000, pose: { ...GUARD, x: 0.62 } }];
    expect(fight(drift).every((frame) => frame.slip === 0)).toBe(true);
  });

  it("takes a step to a new spot as a step once it is held", () => {
    const frames = fight(move({ x: 0.6 }, GUARD, 3000));
    expect(at(frames, 800).slip).toBe(1);
    const stayed = frames.filter((frame) => frame.time > 2400 && frame.time < 3650);
    expect(stayed.every((frame) => frame.slip === 0)).toBe(true);
    // Stepping quickly back is a slip for a moment, as it looks the same, but never a held one.
    const back = frames.filter((frame) => frame.time > 3650 && frame.slip !== 0);
    expect(back.length / 30).toBeLessThan(0.6);
  });

  it("ducks when the head dips under its line, and a dip is not a slip", () => {
    const frames = fight(move({ crouch: 0.6, bow: 0.2 }));
    expect(at(frames, 400).duck).toBe(false);
    expect(at(frames, 900).duck).toBe(true);
    expect(frames.every((frame) => frame.slip === 0)).toBe(true);
    expect(frames[frames.length - 1]!.duck).toBe(false);
  });

  it("still ducks straight out of a boxer's bounce on the toes", () => {
    const bounce: PoseKey[] = [0, 1, 2, 3, 4, 5].map((i) => ({ at: i * 160, pose: { ...GUARD, lift: i % 2 ? 0.05 : 0 } }));
    const keys: PoseKey[] = [...bounce, { at: 950, pose: { ...GUARD, crouch: 0.6, bow: 0.2 } }, { at: 1400, pose: { ...GUARD, crouch: 0.6, bow: 0.2 } }];
    const frames = fight(keys);
    expect(frames.filter((frame) => frame.time < 850).every((frame) => !frame.duck)).toBe(true);
    expect(at(frames, 1100).duck).toBe(true);
  });
});
