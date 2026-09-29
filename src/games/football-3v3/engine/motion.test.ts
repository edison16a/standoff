import { describe, expect, it } from "vitest";
import { createAthlete, topSpeed } from "./body";
import { moveAthlete } from "./motion";
import type { Athlete } from "./types";

const DT = 1 / 60;

function runner(build: "speedster" | "powerback" = "speedster"): Athlete {
  return createAthlete(0, 0, "runner", 0, build, null);
}

function run(a: Athlete, seconds: number, move = { x: 1, z: 0 }): void {
  a.move = move;
  for (let t = 0; t < seconds; t += DT) moveAthlete(a, DT, false, null);
}

describe("heavy running", () => {
  it("takes a couple of seconds to reach top speed", () => {
    const a = runner();
    run(a, 0.5);
    const early = Math.hypot(a.vx, a.vz);
    expect(early).toBeLessThan(topSpeed(a, false) * 0.6);
    run(a, 3);
    expect(Math.hypot(a.vx, a.vz)).toBeGreaterThan(topSpeed(a, false) * 0.9);
  });

  it("gets a heavy player going slower than a light one", () => {
    const light = runner("speedster");
    const heavy = runner("powerback");
    run(light, 0.6);
    run(heavy, 0.6);
    expect(Math.hypot(heavy.vx, heavy.vz)).toBeLessThan(Math.hypot(light.vx, light.vz));
  });

  it("turns at speed on a wide radius, not on the spot", () => {
    const a = runner();
    run(a, 3);
    const speed = Math.hypot(a.vx, a.vz);
    // Ask for a hard turn to the side and watch how far forward it carries.
    const startX = a.x;
    run(a, 0.6, { x: 0, z: 1 });
    expect(a.x - startX).toBeGreaterThan(speed * 0.25);
    expect(a.vz).toBeGreaterThan(0);
  });

  it("stops over a braking distance", () => {
    const a = runner();
    run(a, 3);
    const x = a.x;
    run(a, 2, { x: 0, z: 0 });
    expect(Math.hypot(a.vx, a.vz)).toBeLessThan(0.05);
    expect(a.x - x).toBeGreaterThan(2);
  });

  it("stands still in the stance", () => {
    const a = runner();
    a.action = { kind: "stance", t: 0 };
    run(a, 1);
    expect(a.x).toBe(0);
  });
});
