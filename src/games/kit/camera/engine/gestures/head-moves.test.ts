import { describe, expect, it } from "vitest";
import { eventsOf, readMoves, type ReadFrame } from "../sequence";
import type { PoseSpec } from "../synthetic";
import { MOVES, type PoseKey } from "../timeline";
import { HeadMoveDetector } from "./head-moves";

const kinds = (frames: ReadFrame[]) => frames.flatMap((f) => f.events.map((e) => e.type)).filter((type) => type !== "back");
const firstTime = (frames: ReadFrame[], type: "jump" | "duck") => eventsOf(frames, type)[0]?.time ?? Infinity;

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

describe("jumping: the head over the top of the band", () => {
  it("starts once and lands once", () => {
    const frames = readMoves(MOVES.jump());
    expect(kinds(frames)).toEqual(["jump", "land"]);
    expect((eventsOf(frames, "jump")[0] as { confidence: number }).confidence).toBeGreaterThan(0.3);
    expect(frames.some((f) => f.state.jumping)).toBe(true);
  });

  it("works for a player close up and one further back", () => {
    for (const base of [{ height: 2.4 }, { height: 0.9, x: 0.3 }] satisfies PoseSpec[]) {
      expect(kinds(readMoves(MOVES.jump(base), base))).toEqual(["jump", "land"]);
    }
  });

  it("is seen within 150 ms through the smoothing, and still caught at 8 frames a second", () => {
    expect(firstTime(readMoves(MOVES.jump(), {}, { smooth: true }), "jump")).toBeLessThanOrEqual(150);
    expect(eventsOf(readMoves(MOVES.jump(), {}, { fps: 8 }), "jump")).toHaveLength(1);
  });

  it("still jumps on a machine that tracks only a frame or two a second", () => {
    const held: PoseKey[] = [{ at: 0, pose: {} }, { at: 100, pose: { lift: 0.2 } }, { at: 2500, pose: { lift: 0.2 } }, { at: 2600, pose: {} }];
    expect(kinds(readMoves(held, {}, { fps: 1.5 }))).toEqual(["jump", "land"]);
  });

  it("counts a jump that carries the head out of the top of the picture", () => {
    const base = { head: 0.14 };
    const frames = readMoves(MOVES.jump(base), base);
    expect(frames.some((f) => !f.body.headSeen)).toBe(true);
    expect(kinds(frames)).toEqual(["jump", "land"]);
  });

  it("ignores tiptoes, raised arms and a slow stretch up", () => {
    const tiptoe: PoseKey[] = [{ at: 0, pose: {} }, { at: 300, pose: { lift: 0.04 } }, { at: 800, pose: { lift: 0.04 } }];
    const arms: PoseKey[] = [{ at: 0, pose: {} }, { at: 250, pose: { left: { raise: 1 }, right: { raise: 1 } } }];
    const stretch: PoseKey[] = [{ at: 0, pose: {} }, { at: 2500, pose: { lift: 0.2 } }, { at: 3500, pose: { lift: 0.2 } }];
    for (const keys of [tiptoe, arms, stretch]) expect(eventsOf(readMoves(keys), "jump")).toEqual([]);
  });
});

describe("ducking: the head under the bottom of the band", () => {
  it("goes down once and stands once, held while the head stays down", () => {
    const frames = readMoves(MOVES.duck());
    expect(kinds(frames)).toEqual(["duck", "stand"]);
    const down = frames.filter((f) => f.state.ducking).map((f) => f.body.time);
    expect(down[down.length - 1]! - down[0]!).toBeGreaterThan(500);
  });

  it("counts a deep bow as well as a squat", () => {
    const bow: PoseKey[] = [{ at: 0, pose: {} }, { at: 250, pose: { bow: 0.8 } }, { at: 600, pose: { bow: 0.8 } }];
    const squat: PoseKey[] = [{ at: 0, pose: {} }, { at: 250, pose: { crouch: 0.5 } }, { at: 600, pose: { crouch: 0.5 } }];
    expect(eventsOf(readMoves(bow), "duck")).toHaveLength(1);
    expect(eventsOf(readMoves(squat), "duck")).toHaveLength(1);
  });

  it("works near and far, on slow machines, and within about 200 ms through the smoothing", () => {
    expect(eventsOf(readMoves(MOVES.duck({ height: 2.4 }), { height: 2.4 }), "duck")).toHaveLength(1);
    expect(eventsOf(readMoves(MOVES.duck({ height: 0.9 }), { height: 0.9 }), "duck")).toHaveLength(1);
    expect(eventsOf(readMoves(MOVES.duck(), {}, { fps: 6 }), "duck")).toHaveLength(1);
    expect(firstTime(readMoves(MOVES.duck(), {}, { smooth: true }), "duck")).toBeLessThanOrEqual(210);
  });
});

describe("bobbing and landing", () => {
  it("ignores bobbing on the spot and nodding, however long it goes on", () => {
    const bob: PoseKey[] = Array.from({ length: 16 }, (_, i) => ({ at: i * 160, pose: { crouch: i % 2 ? 0.2 : 0, lift: i % 4 === 2 ? 0.03 : 0 } }));
    const nod: PoseKey[] = Array.from({ length: 10 }, (_, i) => ({ at: i * 200, pose: { bow: i % 2 ? 0.12 : 0 } }));
    for (const keys of [bob, nod]) {
      const events = kinds(readMoves(keys, {}, { smooth: true }));
      expect(events.filter((e) => e === "jump" || e === "duck")).toEqual([]);
    }
  });

  it("does not read the bend of a landing as a duck", () => {
    for (const crouch of [0.3, 0.45, 0.6]) expect(kinds(readMoves(realJump(crouch), {}, { smooth: true }))).toEqual(["jump", "land"]);
  });

  it("still ducks when the player lands and stays down", () => {
    const keys: PoseKey[] = [...realJump(0.6).slice(0, -1), { at: 1500, pose: { crouch: 0.6 } }, { at: 1700, pose: {} }];
    const frames = readMoves(keys, {}, { smooth: true });
    expect(kinds(frames)).toEqual(["jump", "land", "duck", "stand"]);
    const landed = eventsOf(frames, "land")[0]!.time;
    expect(eventsOf(frames, "duck")[0]!.time - landed).toBeGreaterThanOrEqual(400);
  });

  it("holds a move until the head is well back in the band, so an edge never flickers", () => {
    const detector = new HeadMoveDetector();
    const at = (rise: number, time: number) => detector.update(rise, time);
    at(0, 0);
    expect(at(0.4, 100).jumped).toBe(true);
    expect(at(0.3, 133).jumping).toBe(true);
    expect(at(0.36, 166).jumped).toBe(false);
    expect(at(0.1, 200).landed).toBe(true);
    expect(at(-0.45, 700).ducked).toBe(false);
    expect(at(-0.45, 780).ducked).toBe(true);
    expect(at(-0.3, 800).ducking).toBe(true);
    expect(at(-0.1, 833).stood).toBe(true);
  });
});
