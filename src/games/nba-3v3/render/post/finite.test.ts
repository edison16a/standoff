import { describe, expect, it } from "vitest";
import { finite, FINITE, HALF_MAX, nonFinite } from "./finite";

describe("non finite test", () => {
  it("catches NaN and both infinities", () => {
    expect(nonFinite(Number.NaN)).toBe(true);
    expect(nonFinite(Infinity)).toBe(true);
    expect(nonFinite(-Infinity)).toBe(true);
    expect(nonFinite(0 / 0)).toBe(true);
  });

  it("catches what overflows a 32 bit float, as the shader would see it", () => {
    expect(nonFinite(1e39)).toBe(true);
    expect(nonFinite(-1e39)).toBe(true);
  });

  it("lets every real value through, however small or large", () => {
    for (const x of [0, -0, 1, -1, 0.5, HALF_MAX, 3.4e38, -3.4e38, 1e-45, 1.2e-38]) expect(nonFinite(x)).toBe(false);
  });

  it("reads the same exponent bits as the shader", () => {
    expect(FINITE).toContain("0x7f800000u");
    expect(FINITE).toContain("floatBitsToUint");
    // isnan and isinf are what fast math compilers drop, so the snippet must not lean on them.
    expect(FINITE).not.toMatch(/isnan|isinf/);
  });
});

describe("finite clean up", () => {
  it("turns NaN and negative infinity black", () => {
    expect(finite(Number.NaN)).toBe(0);
    expect(finite(-Infinity)).toBe(0);
    expect(finite(-1e39)).toBe(0);
  });

  it("keeps a glint too bright for a half float as the brightest light, not a black dot", () => {
    expect(finite(Infinity)).toBe(HALF_MAX);
    expect(finite(1e39)).toBe(HALF_MAX);
  });

  it("keeps light as it is, within what a half float holds", () => {
    expect(finite(0.25)).toBe(0.25);
    expect(finite(40)).toBe(40);
    expect(finite(1e6)).toBe(HALF_MAX);
    expect(finite(-2)).toBe(0);
  });

  it("puts the half float ceiling into the shader", () => {
    expect(FINITE).toContain(HALF_MAX.toFixed(1));
  });

  it("tells positive infinity from NaN by its exact bits in the shader", () => {
    // Positive infinity is exactly the exponent bits; NaN has mantissa bits set and negative infinity the sign bit.
    expect(FINITE).toMatch(/equal\(bits, uvec3\(0x7f800000u\)\)/);
    // A boolean mix selects, so a NaN on the other side cannot poison the result as a float mix would.
    expect(FINITE).toMatch(/mix\(kept, swap, bad\)/);
  });
});
