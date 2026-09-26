import { describe, expect, it } from "vitest";
import { closestBetween, type Segment } from "./geometry";

const seg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): Segment => ({
  a: { x: ax, y: ay, z: az },
  b: { x: bx, y: by, z: bz },
});

describe("closestBetween", () => {
  it("finds where two crossing segments pass each other", () => {
    const hit = closestBetween(seg(-1, 0, 0, 1, 0, 0), seg(0, -1, 0.3, 0, 1, 0.3));
    expect(hit.distance).toBeCloseTo(0.3);
    expect(hit.s).toBeCloseTo(0.5);
    expect(hit.t).toBeCloseTo(0.5);
  });

  it("clamps to the ends when the nearest points lie beyond them", () => {
    const hit = closestBetween(seg(0, 0, 0, 1, 0, 0), seg(2, 1, 0, 3, 1, 0));
    expect(hit.s).toBe(1);
    expect(hit.t).toBe(0);
    expect(hit.distance).toBeCloseTo(Math.SQRT2);
  });

  it("handles parallel segments, like two blades held together", () => {
    const hit = closestBetween(seg(0, 0, 0, 1, 0, 0), seg(0.2, 0.05, 0, 0.8, 0.05, 0));
    expect(hit.distance).toBeCloseTo(0.05);
  });

  it("treats a zero length segment as a point", () => {
    expect(closestBetween(seg(0, 0, 0, 0, 0, 0), seg(-1, 0.5, 0, 1, 0.5, 0)).distance).toBeCloseTo(0.5);
    expect(closestBetween(seg(-1, 0.5, 0, 1, 0.5, 0), seg(0, 0, 0, 0, 0, 0)).distance).toBeCloseTo(0.5);
    expect(closestBetween(seg(1, 1, 1, 1, 1, 1), seg(1, 1, 2, 1, 1, 2)).distance).toBeCloseTo(1);
  });
});
