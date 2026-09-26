import { describe, expect, it } from "vitest";
import { Footwork, STANCE } from "./footwork";

/** Walks a fighter along the line at `speed` for `seconds`, sixty frames a second, watching the feet. */
function walk(speed: number, seconds: number) {
  const feet = new Footwork();
  let x = -1.75;
  feet.reset(x, 1);
  const dt = 1 / 60;
  let slid = 0;
  let steps = 0;
  const last = { R: feet.ankle("R", x, 1), L: feet.ankle("L", x, 1) };
  for (let t = 0; t < seconds; t += dt) {
    x += speed * dt;
    feet.update(x, 1, speed, dt);
    for (const side of ["R", "L"] as const) {
      const now = feet.ankle(side, x, 1);
      const worldNow = now.f + x;
      const worldThen = last[side].f + (x - speed * dt);
      // A foot on the floor must not move along it.
      if (now.u <= 0.0801 && last[side].u <= 0.0801) slid = Math.max(slid, Math.abs(worldNow - worldThen));
      if (now.u > 0.0801 && last[side].u <= 0.0801) steps++;
      last[side] = now;
    }
  }
  return { feet, x, slid, steps };
}

describe("footwork", () => {
  it("keeps planted feet still on the floor while the body walks", () => {
    expect(walk(1.7, 2).slid).toBeLessThan(1e-9);
    expect(walk(-1.7, 2).slid).toBeLessThan(1e-9);
  });

  it("steps as the body moves, and not at all while it stands still", () => {
    expect(walk(1.7, 2).steps).toBeGreaterThan(6);
    expect(walk(0, 2).steps).toBe(0);
  });

  it("keeps both feet within a leg's reach of the body while walking", () => {
    const feet = new Footwork();
    let x = 0;
    feet.reset(x, 1);
    for (let i = 0; i < 180; i++) {
      x += 1.7 / 60;
      feet.update(x, 1, 1.7, 1 / 60);
      for (const side of ["R", "L"] as const) expect(Math.abs(feet.ankle(side, x, 1).f)).toBeLessThan(0.5);
    }
  });

  it("settles back into its stance after the body stops", () => {
    const { feet, x } = walk(1.7, 1);
    for (let i = 0; i < 120; i++) feet.update(x, 1, 0, 1 / 60);
    expect(feet.ankle("R", x, 1).f).toBeCloseTo(STANCE.R.f, 1);
    expect(feet.ankle("L", x, 1).f).toBeCloseTo(STANCE.L.f, 1);
  });
});
