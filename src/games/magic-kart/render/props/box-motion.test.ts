import { describe, expect, it } from "vitest";
import { STACK_GAP } from "../../engine/pickups";
import { BOX_SIZE, cubeTurn, popScale, POP_IN, reach, shove, STACK_SCALE, STACK_TILT, stepWobble, stillWobble } from "./box-motion";

describe("item box motion", () => {
  it("keeps the two cubes of a double box clear of each other at every turn and bob", () => {
    const half = reach(BOX_SIZE * STACK_SCALE, STACK_TILT);
    expect(half * 2).toBeLessThan(STACK_GAP);
    for (let t = 0; t < 6; t += 0.05) {
      const low = cubeTurn(3, 0, 2, t);
      const high = cubeTurn(3, 1, 2, t);
      // They bob as one, so only the turn could bring them together, and the reach covers every turn.
      expect(high.lift).toBe(low.lift);
    }
  });

  it("turns the stacked cubes opposite ways and tumbles a single on a lean", () => {
    const a = cubeTurn(0, 0, 2, 1);
    const b = cubeTurn(0, 0, 2, 2);
    const c = cubeTurn(0, 1, 2, 1);
    const d = cubeTurn(0, 1, 2, 2);
    expect(Math.sign(b.yaw - a.yaw)).toBe(-Math.sign(d.yaw - c.yaw));
    expect(cubeTurn(0, 0, 1, 1).tilt).toBeGreaterThan(STACK_TILT);
  });

  it("swells a returning box past full size, then settles on it", () => {
    expect(popScale(0)).toBe(0);
    expect(popScale(POP_IN)).toBe(1);
    expect(popScale(POP_IN * 5)).toBe(1);
    let peak = 0;
    for (let t = 0; t <= POP_IN; t += 0.01) peak = Math.max(peak, popScale(t));
    expect(peak).toBeGreaterThan(1.05);
    expect(peak).toBeLessThan(1.25);
  });

  it("swings a shoved box back to rest within a second or so", () => {
    const w = stillWobble();
    shove(w, 0, 25, 1, 0);
    expect(w.vz).toBeGreaterThan(0);
    expect(w.vx).toBeGreaterThan(0);
    let far = 0;
    for (let i = 0; i < 30; i++) {
      stepWobble(w, 1 / 60);
      far = Math.max(far, Math.hypot(w.x, w.z));
    }
    // Knocked a hand's width or so, never flung away.
    expect(far).toBeGreaterThan(0.15);
    expect(far).toBeLessThan(0.8);
    for (let i = 0; i < 60; i++) stepWobble(w, 1 / 60);
    expect(Math.hypot(w.x, w.z)).toBeLessThan(0.03);
    // A long frame does not blow the spring up.
    shove(w, 0, 25, 1, 0);
    stepWobble(w, 0.25);
    expect(Math.hypot(w.x, w.z)).toBeLessThan(1);
  });
});
