import { describe, expect, it } from "vitest";
import { portalFrame, RING_MIN, WALL_TOP } from "./portal-frame";
import type { TracePoint } from "./trace";

/** A straight path at one height, passing x 0 to 20. */
const level = (y: number): TracePoint[] => Array.from({ length: 41 }, (_, i) => ({ t: i, x: i / 2, y, grounded: true, gravity: 1 }));

describe("a portal's frame", () => {
  it("stands a run on the floor in a tall ring with a wall to the sky over it", () => {
    const frame = portalFrame(level(0.46), 10, null);
    expect(frame.bottom).toBe(0);
    expect(frame.top).toBeCloseTo(RING_MIN);
    expect(frame.walls).toEqual([{ x: 9.5, y: RING_MIN, w: 1, h: WALL_TOP - RING_MIN }]);
  });

  it("raises a pillar under a run flying high, and stops the wall at the ceiling", () => {
    const frame = portalFrame(level(5), 10, 9);
    expect(frame.bottom).toBeGreaterThan(2);
    expect(frame.bottom).toBeLessThan(5 - 0.46);
    expect(frame.top).toBeGreaterThan(5 + 0.46);
    expect(frame.walls[0]).toEqual({ x: 9.5, y: 0, w: 1, h: frame.bottom });
    expect(frame.walls[1]!.y + frame.walls[1]!.h).toBe(9);
  });

  it("opens up to a low ceiling without a sliver of wall", () => {
    const frame = portalFrame(level(4.5), 10, 6);
    expect(frame.top).toBe(6);
    expect(frame.walls).toHaveLength(1);
  });

  it("refuses a portal the run never reaches", () => {
    expect(() => portalFrame(level(1), 40, null)).toThrow();
  });
});
