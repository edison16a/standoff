import { describe, expect, it } from "vitest";
import { flight, GRAVITY, ROUNDS } from "../../ballistics/rounds";
import { ARC_GAIN, arcLift, drawTime, roundPoint, tailTime, type Point3 } from "./arc";

const from: Point3 = { x: 0.3, y: 1.3, z: 0 };
const to: Point3 = { x: 2, y: 1.1, z: -25 };
const length = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);

describe("the drawn path of a round", () => {
  for (const [name, spec] of Object.entries(ROUNDS)) {
    it(`leaves the muzzle and lands exactly on the hit (${name})`, () => {
      const total = flight(spec, length).time;
      const start = roundPoint(spec, from, to, length, total, 0, { x: 0, y: 0, z: 0 });
      const end = roundPoint(spec, from, to, length, total, total, { x: 0, y: 0, z: 0 });
      for (const axis of ["x", "y", "z"] as const) {
        expect(start[axis]).toBeCloseTo(from[axis], 9);
        expect(end[axis]).toBeCloseTo(to[axis], 9);
      }
    });
  }

  it("bows above the line as a parabola, highest halfway, and drops below it past the end", () => {
    const total = 0.08;
    const mid = arcLift(total / 2, total);
    expect(mid).toBeCloseTo((ARC_GAIN * GRAVITY * total * total) / 8, 12);
    expect(arcLift(total * 0.25, total)).toBeLessThan(mid);
    expect(arcLift(total * 0.75, total)).toBeCloseTo(arcLift(total * 0.25, total), 12);
    expect(arcLift(total * 1.3, total)).toBeLessThan(0);
  });

  it("stays slight: under a centimetre for a rifle round across the street", () => {
    const total = flight(ROUNDS.rifle, 30).time;
    expect(arcLift(total / 2, total)).toBeLessThan(0.01);
  });

  it("covers the first half of the way faster than the second, as drag slows it", () => {
    const spec = ROUNDS.shotgun;
    const total = flight(spec, length).time;
    const half = roundPoint(spec, from, to, length, total, total / 2, { x: 0, y: 0, z: 0 });
    const gone = Math.abs(half.z - from.z) / Math.abs(to.z - from.z);
    expect(gone).toBeGreaterThan(0.5);
  });
});

describe("motion blur and drawing", () => {
  it("never starts the blur behind the muzzle", () => {
    expect(tailTime(0.004, 1 / 90)).toBe(0);
    expect(tailTime(0.05, 0.01)).toBeCloseTo(0.04);
  });

  it("draws a round that lands between two frames once, on its target", () => {
    expect(drawTime(0.05, 0.02, false)).toBe(0.02);
    expect(drawTime(0.05, 0.02, true)).toBe(0.05);
  });
});
