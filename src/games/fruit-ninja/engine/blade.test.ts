import { describe, expect, it } from "vitest";
import { Blade } from "./blade";
import { sweepHit } from "./geometry";
import { BLADE_GAP_S } from "./tuning";

/** Moves a blade in a straight line at a steady speed, one 60 Hz frame at a time. */
function drag(blade: Blade, from: { x: number; y: number }, velocity: { x: number; y: number }, frames: number, t0 = 0): number {
  let t = t0;
  for (let i = 0; i <= frames; i++) {
    blade.move({ x: from.x + velocity.x * (t - t0), y: from.y + velocity.y * (t - t0) }, t);
    t += 1 / 60;
  }
  return t;
}

describe("the blade sweep", () => {
  it("hits a circle the segment passes through", () => {
    const t = sweepHit({ x: -2, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 0.5);
    expect(t).toBeCloseTo(0.375, 5);
  });

  it("misses a circle beside the path", () => {
    expect(sweepHit({ x: -2, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 0.5)).toBeNull();
  });

  it("catches a fruit that moves across a still blade path between frames", () => {
    // The fruit starts above the blade and ends below it, never touching either endpoint.
    const t = sweepHit({ x: 0, y: 0 }, { x: 0.1, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }, 0.3);
    expect(t).not.toBeNull();
  });

  it("does not count a hit behind the start", () => {
    expect(sweepHit({ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 0.5)).toBeNull();
  });
});

describe("a player's blade", () => {
  it("cuts when it moves fast", () => {
    const blade = new Blade();
    drag(blade, { x: -3, y: 0 }, { x: 20, y: 0 }, 6);
    expect(blade.cutting).toBe(true);
    expect(blade.direction.x).toBeCloseTo(1, 5);
  });

  it("does not cut while hovering slowly", () => {
    const blade = new Blade();
    drag(blade, { x: 0, y: 0 }, { x: 1.5, y: 0.5 }, 30);
    expect(blade.cutting).toBe(false);
  });

  it("starts a swipe once per fast stroke", () => {
    const blade = new Blade();
    let swipes = 0;
    let t = 0;
    for (let i = 0; i < 20; i++) {
      blade.move({ x: -4 + i * 0.4, y: 0 }, t);
      if (blade.swipeStarted) swipes += 1;
      t += 1 / 60;
    }
    expect(swipes).toBe(1);
  });

  it("never draws a cutting path across a gap in the aim", () => {
    const blade = new Blade();
    const t = drag(blade, { x: -3, y: 0 }, { x: 20, y: 0 }, 6);
    blade.move(null, t);
    expect(blade.segment).toBeNull();
    blade.move({ x: 4, y: 4 }, t + 1 / 60);
    expect(blade.cutting).toBe(false);
    blade.move({ x: 4, y: 4 }, t + BLADE_GAP_S + 1);
    expect(blade.segment).toBeNull();
  });
});
