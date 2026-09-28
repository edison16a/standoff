import { describe, expect, it } from "vitest";
import { CatchUp } from "./catch-up";

const FRAME = 1 / 60;

describe("easing the drawn height after a replayed jump", () => {
  it("draws ordinary movement exactly where it is", () => {
    const ease = new CatchUp();
    for (let i = 0; i < 30; i++) expect(ease.apply(0.46 + i * 0.3, FRAME)).toBeCloseTo(0.46 + i * 0.3, 9);
  });

  it("rises to a replayed height over a few frames instead of blinking there", () => {
    const ease = new CatchUp();
    ease.apply(0.46, FRAME);
    const first = ease.apply(1.9, FRAME);
    expect(first).toBeGreaterThan(0.46);
    expect(first).toBeLessThan(1.9);
    let y = first;
    for (let i = 0; i < 12; i++) y = ease.apply(1.9, FRAME);
    expect(y).toBeCloseTo(1.9, 2);
  });

  it("jumps straight to a respawn once reset", () => {
    const ease = new CatchUp();
    ease.apply(6, FRAME);
    ease.reset();
    expect(ease.apply(0.46, FRAME)).toBe(0.46);
  });
});
