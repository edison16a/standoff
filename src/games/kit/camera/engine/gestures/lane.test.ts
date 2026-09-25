import { describe, expect, it } from "vitest";
import { readMoves } from "../sequence";
import type { PoseSpec } from "../synthetic";
import type { PoseKey } from "../timeline";
import { LaneTracker } from "./lane";

/** Walks a waist up player through spots and returns every lane change, calibrated standing in `base`. */
function lanes(xs: number[], base: PoseSpec = { x: 0.5 }) {
  const keys: PoseKey[] = xs.map((x, i) => ({ at: i * 500, pose: { ...base, x } }));
  return readMoves(keys, base);
}
const changes = (frames: ReturnType<typeof lanes>) => frames.flatMap((f) => f.events.flatMap((e) => (e.type === "lane" ? [e.lane] : [])));

describe("lanes from moving sideways, waist up", () => {
  it("moves into the side lanes and back to the middle", () => {
    expect(changes(lanes([0.5, 0.7, 0.5, 0.3, 0.5]))).toEqual([1, 0, -1, 0]);
  });

  it("stays put near the middle, and past halfway only by the hysteresis", () => {
    const tracker = new LaneTracker();
    expect(tracker.update(0.3).lane).toBe(0);
    expect(tracker.update(0.6).lane).toBe(0);
    expect(tracker.update(0.7).changed).toBe(true);
    expect(tracker.update(0.4).lane).toBe(1);
    expect(tracker.update(0.3).lane).toBe(0);
    expect(changes(lanes([0.5, 0.53, 0.47, 0.5]))).toEqual([]);
  });

  it("counts a lean to one side, since the head and shoulders go with it", () => {
    const lean: PoseKey[] = [{ at: 0, pose: {} }, { at: 250, pose: { lean: 1 } }, { at: 700, pose: { lean: 1 } }, { at: 950, pose: {} }];
    expect(changes(readMoves(lean))).toEqual([1, 0]);
  });

  it("stops at the outside lanes, and offers five lanes too", () => {
    const frames = lanes([0.5, 0.95]);
    expect(frames.at(-1)!.state.lane).toBe(1);
    expect(frames.at(-1)!.state.head.side).toBeGreaterThan(2);
    const five = new LaneTracker({ lanes: 5, width: 1, hysteresis: 0.15 });
    expect([0.8, 1.7, 2.7, 3.5].map((side) => five.update(side).lane)).toEqual([1, 2, 2, 2]);
  });

  it("measures moves in the player's shoulder widths, so near and far players move alike", () => {
    const near = readMoves([{ at: 0, pose: { x: 0.62, height: 2.4 } }], { x: 0.5, height: 2.4 }, { tail: 0 });
    const far = readMoves([{ at: 0, pose: { x: 0.55, height: 1 } }], { x: 0.5, height: 1 }, { tail: 0 });
    const perMetre = (height: number) => height / 1.72 / (16 / 9);
    expect(near[0]!.state.head.side / (0.12 / perMetre(2.4))).toBeCloseTo(far[0]!.state.head.side / (0.05 / perMetre(1)), 1);
  });

  it("uses the player's own spot as the middle lane", () => {
    const frames = lanes([0.28, 0.46], { x: 0.28, height: 1.4 });
    expect(changes(frames)).toEqual([1]);
    expect(frames[0]!.state.head.side).toBeCloseTo(0, 2);
  });
});
