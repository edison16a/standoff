import { describe, expect, it } from "vitest";
import type { BuildId } from "../builds";
import { createAthlete } from "./body";
import { fumbleChance, HIT, resolveHit, squareness } from "./hit";
import { Rng } from "./rng";
import type { Athlete } from "./types";

/** A player at (x, z) running at velocity (vx, vz). */
function player(build: BuildId, x: number, z: number, vx: number, vz: number): Athlete {
  const a = createAthlete(0, 0, "runner", 0, build, null);
  Object.assign(a, { x, z, vx, vz, yaw: Math.atan2(vx, vz) });
  return a;
}

/** How many of `n` tries bring the carrier down. */
function downs(n: number, make: () => [Athlete, Athlete]): number {
  const rng = new Rng(3);
  let count = 0;
  for (let i = 0; i < n; i++) {
    const [t, c] = make();
    if (resolveHit(t, c, rng).down) count++;
  }
  return count;
}

describe("a tackle settled by momentum", () => {
  it("keeps the total momentum along the hit", () => {
    const t = player("lockdown", 0, 0, 8.5, 0);
    const c = player("powerback", 1, 0, -6, 0);
    const before = t.mass * t.vx + c.mass * c.vx;
    resolveHit(t, c, new Rng(1));
    expect(t.mass * t.vx + c.mass * c.vx).toBeCloseTo(before, 6);
    // A hard, sticky hit: they end up moving together along it.
    expect(t.vx).toBeCloseTo(c.vx, 6);
  });

  it("knocks a lighter carrier back when the tackler meets him head on at speed", () => {
    const t = player("lockdown", 0, 0, 8.5, 0);
    const c = player("speedster", 1, 0, -5, 0);
    const hit = resolveHit(t, c, new Rng(1));
    expect(hit.big).toBe(true);
    expect(hit.down).toBe(true);
    expect(c.vx).toBeGreaterThan(0);
  });

  it("lets a big back run through arm tackles from behind that bring a small one down", () => {
    const fromBehind = (build: BuildId): [Athlete, Athlete] => [player("scrambler", -1, 0, 9.5, 0), player(build, 0, 0, 8, 0)];
    const big = downs(200, () => fromBehind("powerback"));
    const small = downs(200, () => fromBehind("routerunner"));
    expect(big).toBeLessThan(small);
    expect(big).toBeLessThan(120);
  });

  it("holds a square tackle far more often than one from behind", () => {
    const square = downs(200, () => [player("routerunner", 1, 0, -2, 0), player("powerback", 0, 0, 3, 0)]);
    const behind = downs(200, () => [player("routerunner", -1, 0, 9, 0), player("powerback", 0, 0, 8, 0)]);
    expect(square).toBeGreaterThan(behind + 40);
  });

  it("rates the angle of the hit", () => {
    const c = player("speedster", 0, 0, 8, 0);
    const t = player("lockdown", 0, 0, 0, 0);
    expect(squareness(t, c, { x: -1, z: 0 })).toBe(1);
    expect(squareness(t, c, { x: 0, z: 1 })).toBeCloseTo(0.62);
    expect(squareness(t, c, { x: 1, z: 0 })).toBeCloseTo(0.35);
  });

  it("jars the ball loose more on bigger hits, less from strong hands", () => {
    expect(fumbleChance(4, 6, 6)).toBeGreaterThan(fumbleChance(0.5, 6, 6));
    expect(fumbleChance(3, 10, 10)).toBeLessThan(fumbleChance(3, 3, 3));
    expect(fumbleChance(50, 1, 1)).toBeLessThanOrEqual(HIT.fumbleCap * 1.3);
  });
});
