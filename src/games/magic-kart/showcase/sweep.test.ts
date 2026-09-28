import { describe, expect, it } from "vitest";
import { framingAt, type SweepKey } from "./sweep";

const keys: readonly SweepKey[] = [
  { at: 10, back: 8, side: -2, height: 2, fov: 50 },
  { at: 12, back: 12, side: 2, height: 6, fov: 60 },
];

describe("framingAt", () => {
  it("holds the first framing before the sweep and the last after it", () => {
    expect({ ...framingAt(keys, 5) }).toEqual({ back: 8, side: -2, height: 2, fov: 50 });
    expect({ ...framingAt(keys, 20) }).toEqual({ back: 12, side: 2, height: 6, fov: 60 });
  });

  it("is halfway between two keys at the middle of their span", () => {
    expect({ ...framingAt(keys, 11) }).toEqual({ back: 10, side: 0, height: 4, fov: 55 });
  });

  it("eases, moving less near a key than in the middle", () => {
    const early = framingAt(keys, 10.2).back - 8;
    const middle = framingAt(keys, 11.1).back - framingAt(keys, 10.9).back;
    expect(early).toBeLessThan(middle);
  });

  it("passes through every key on the way", () => {
    const three = [...keys, { at: 13, back: 4, side: 0, height: 3, fov: 45 }];
    expect(framingAt(three, 12).back).toBe(12);
    expect(framingAt(three, 13).fov).toBe(45);
  });
});
