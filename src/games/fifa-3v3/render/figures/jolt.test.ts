import { describe, expect, it } from "vitest";
import { neutral } from "../anim/pose";
import { Jolt } from "./jolt";

function after(j: Jolt, seconds: number) {
  j.step(seconds);
  const p = neutral();
  j.apply(p);
  return p;
}

describe("Jolt", () => {
  it("rocks the trunk the way it was pushed, then settles", () => {
    const j = new Jolt();
    j.hit(0, 1, 1);
    const early = after(j, 0.08);
    expect(early.spineX).toBeGreaterThan(0.05);
    expect(early.shLZ).toBeGreaterThan(neutral().shLZ);
    const late = after(j, 1);
    expect(Math.abs(late.spineX)).toBeLessThan(0.01);
  });

  it("tips the body to the side it was shoved toward", () => {
    const j = new Jolt();
    // Pushed toward its left (+x): the top of the body goes left, a negative roll.
    j.hit(1, 0, 1);
    const p = after(j, 0.08);
    expect(p.roll).toBeLessThan(0);
  });
});
