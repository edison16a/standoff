import { describe, expect, it } from "vitest";
import { packDistance, signedDistance } from "./sdf";

/** A filled square of side `side` in the middle of an n by n grid. */
function square(n: number, side: number): Uint8Array {
  const m = new Uint8Array(n * n);
  const lo = (n - side) / 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (x >= lo && x < lo + side && y >= lo && y < lo + side) m[y * n + x] = 255;
  return m;
}

describe("signed distance fields for the painted marks", () => {
  it("is negative inside, positive outside, and counts cells across the edge", () => {
    const n = 21;
    const sd = signedDistance(square(n, 9), n, n);
    const at = (x: number, y: number) => sd[y * n + x]!;
    // The square runs from cell 6 to 14; a hard edge falls halfway between 5 and 6.
    expect(at(10, 10)).toBeCloseTo(-5, 5);
    expect(at(0, 10)).toBeCloseTo(6, 5);
    expect(at(6, 10)).toBeLessThan(0);
    expect(at(5, 10)).toBeGreaterThan(0);
    expect(at(5, 10) + at(6, 10)).toBeCloseTo(0, 5);
  });

  it("measures true distance on the diagonal, not steps", () => {
    const n = 31;
    const m = new Uint8Array(n * n);
    m[15 * n + 15] = 255;
    const sd = signedDistance(m, n, n);
    expect(sd[(15 + 6) * n + 15 + 8]!).toBeCloseTo(10, 5);
  });

  it("puts a half covered cell on the edge", () => {
    const m = new Uint8Array([255, 255, 128, 0, 0]);
    const sd = signedDistance(m, 5, 1);
    expect(Math.abs(sd[2]!)).toBeLessThan(0.05);
  });

  it("packs the edge at 128 and saturates past the spread", () => {
    const packed = packDistance(new Float32Array([0, -100, 100, 4]), 8);
    expect(packed[0]).toBe(128);
    expect(packed[1]).toBe(255);
    expect(packed[2]).toBe(0);
    expect(packed[3]).toBeCloseTo(65, -1);
  });
});
