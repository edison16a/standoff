import { describe, expect, it } from "vitest";
import { baselineFor, bodiesFrom } from "../sequence";
import type { PoseSpec } from "../synthetic";
import type { PoseKey } from "../timeline";
import { LaneTracker, type LaneOptions } from "./lane";

/** Walks a player through spots and returns the lane changes, standing in `base` at calibration. */
function lanes(xs: number[], base: PoseSpec = { x: 0.5 }, options?: LaneOptions) {
  const baseline = baselineFor(base);
  const tracker = new LaneTracker(options);
  const keys: PoseKey[] = xs.map((x, i) => ({ at: i * 500, pose: { ...base, x } }));
  return bodiesFrom(keys).map((body) => tracker.update(body, baseline));
}

const changes = (readings: ReturnType<typeof lanes>) => readings.filter((r) => r.changed).map((r) => r.lane);

describe("lanes from stepping sideways", () => {
  it("steps into the side lanes and back to the middle", () => {
    expect(changes(lanes([0.5, 0.62, 0.5, 0.38, 0.5]))).toEqual([1, 0, -1, 0]);
  });

  it("stays put near the middle, and past halfway only by the hysteresis", () => {
    const small = lanes([0.5, 0.53, 0.47, 0.5]);
    expect(changes(small)).toEqual([]);
    const baseline = baselineFor({ x: 0.5 });
    const unit = baseline.shoulderWidth / (16 / 9);
    // Just past halfway to the next lane is not enough. Past halfway plus the hysteresis is.
    expect(changes(lanes([0.5, 0.5 + 0.58 * unit]))).toEqual([]);
    expect(changes(lanes([0.5, 0.5 + 0.7 * unit]))).toEqual([1]);
  });

  it("stops at the outside lanes", () => {
    const readings = lanes([0.5, 0.9]);
    expect(readings[readings.length - 1]!.lane).toBe(1);
    expect(readings[readings.length - 1]!.offset).toBeGreaterThan(3);
  });

  it("offers five lanes too, one step at a time", () => {
    const five = lanes([0.5, 0.58, 0.66, 0.74], { x: 0.5 }, { lanes: 5, width: 1, hysteresis: 0.15 });
    expect(changes(five)).toEqual([1, 2]);
  });

  it("measures steps in the player's shoulder widths, so near and far players step alike", () => {
    const near = lanes([0.5, 0.62], { x: 0.5, height: 0.9 });
    const far = lanes([0.5, 0.56], { x: 0.5, height: 0.45 });
    expect(near[near.length - 1]!.offset).toBeCloseTo(far[far.length - 1]!.offset, 1);
  });

  it("uses the player's own spot as the middle lane", () => {
    const readings = lanes([0.28, 0.4], { x: 0.28 });
    expect(changes(readings)).toEqual([1]);
    expect(readings[0]!.offset).toBeCloseTo(0, 3);
  });
});
