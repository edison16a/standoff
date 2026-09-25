import { describe, expect, it } from "vitest";
import { deriveBody } from "../body";
import { baselineFor, bodiesFrom, eventsOf, readMoves, type ReadFrame } from "../sequence";
import { syntheticPose, type PoseSpec } from "../synthetic";
import { MOVES, type PoseKey } from "../timeline";
import { DEFAULT_LINE, HeadLine } from "./head-line";

const moved = (frames: ReadFrame[]) => frames.flatMap((f) => f.events.map((e) => e.type)).filter((t) => t !== "back");
const bodyOf = (spec: PoseSpec) => deriveBody(syntheticPose(spec), 0, 16 / 9, null);

describe("the head line", () => {
  it("sits where the head rested at calibration, with the band either side", () => {
    const frame = readMoves([{ at: 0, pose: {} }], {}, { tail: 100 }).at(-1)!;
    const line = frame.state.line!;
    expect(line.y).toBeCloseTo(frame.body.head.y, 3);
    expect(line.top).toBeLessThan(line.y);
    expect(line.bottom).toBeGreaterThan(line.y);
    expect((line.y - line.top) / frame.body.shoulderWidth).toBeCloseTo(0.35, 3);
    expect(line.x).toBeCloseTo(0.5, 2);
    expect(frame.state.head.rise).toBeCloseTo(0, 2);
  });

  it("measures in shoulder widths, so near and far players move alike", () => {
    for (const base of [{ height: 2.4 }, { height: 1 }] satisfies PoseSpec[]) {
      const up = readMoves([{ at: 0, pose: { ...base, lift: 0.1 } }], base, { tail: 0 })[0]!;
      expect(up.state.head.rise).toBeCloseTo(0.1 / 0.34, 1);
    }
  });

  it("moves with a player who walks nearer and further, so walking is never a move", () => {
    const walk: PoseKey[] = [
      { at: 0, pose: {} },
      { at: 1500, pose: { near: 1.3 } },
      { at: 3000, pose: { near: 1.3 } },
      { at: 5000, pose: { near: 0.75 } },
      { at: 6500, pose: { near: 0.75 } },
    ];
    expect(moved(readMoves(walk, {}, { smooth: true }))).toEqual([]);
  });

  it("rides out a quick lean in toward the screen", () => {
    const lean: PoseKey[] = [{ at: 0, pose: {} }, { at: 300, pose: { near: 1.25 } }, { at: 1500, pose: { near: 1.25 } }, { at: 1800, pose: {} }];
    expect(moved(readMoves(lean, {}, { smooth: true }))).toEqual([]);
  });

  it("still reads jumps, ducks and lanes after the player has come nearer", () => {
    const near = { near: 1.3 };
    const keys: PoseKey[] = [{ at: 0, pose: {} }, { at: 1500, pose: near }, ...[MOVES.jump(near), MOVES.duck(near), MOVES.step(near, 0.25)].flatMap((move, i) => move.map((k) => ({ at: 3500 + i * 1600 + k.at, pose: k.pose })))];
    expect(moved(readMoves(keys, {}, { smooth: true }))).toEqual(["jump", "land", "duck", "stand", "lane"]);
  });

  it("follows a player who settles, slowly, and holds still during a move", () => {
    const baseline = baselineFor({});
    const lower = bodyOf({ head: 0.36 });
    const resting = new HeadLine(baseline);
    const start = resting.measure(lower).rise;
    resting.follow(lower, 2000, DEFAULT_LINE);
    expect(resting.measure(lower).rise).toBeCloseTo(start * Math.exp(-1), 2);
    // A duck held for seconds is measured against the line from before it.
    const frames = readMoves([{ at: 0, pose: {} }, { at: 200, pose: { crouch: 0.6 } }, { at: 4000, pose: { crouch: 0.6 } }]);
    const during = frames.filter((f) => f.state.ducking).map((f) => f.state.line!.y);
    expect(Math.max(...during) - Math.min(...during)).toBeLessThan(1e-9);
    expect(eventsOf(frames, "stand")).toEqual([]);
  });

  it("finds the head from the shoulders when a jump takes it out of the picture", () => {
    const line = new HeadLine(baselineFor({ head: 0.12 }));
    const [gone] = bodiesFrom([{ at: 0, pose: { head: 0.12, lift: 0.2 } }], { tail: 0 });
    expect(gone!.headSeen).toBe(false);
    expect(line.measure(gone!).rise).toBeCloseTo(0.2 / 0.34, 1);
  });
});
