import { describe, expect, it } from "vitest";
import { makeAthlete } from "./athlete";
import { bodyMass, bracedMass, collideBodies } from "./contact";
import { moveAthlete, RUN, topSpeed } from "./locomotion";
import { STEP } from "./tuning";
import type { Athlete } from "./types";
import { len } from "./vec";

const runner = (build: Athlete["build"] = "winger") => makeAthlete(0, 0, 0, build, null);

/** Seconds of full stick along +x until the player passes `speed`. */
function timeTo(a: Athlete, speed: number): number {
  for (let t = 0; t < 5; t += STEP) {
    moveAthlete(a, { x: 1, z: 0 }, STEP, false);
    if (len(a.vel) >= speed) return t;
  }
  return Infinity;
}

describe("running", () => {
  it("gets going like a footballer: 5 m/s inside a second, near top speed in about two", () => {
    expect(timeTo(runner(), 5)).toBeGreaterThan(0.4);
    expect(timeTo(runner(), 5)).toBeLessThan(1);
    const a = runner();
    expect(timeTo(a, topSpeed(a) * 0.9)).toBeGreaterThan(1.1);
    expect(timeTo(runner(), topSpeed(runner()) * 0.9)).toBeLessThan(2.4);
  });

  it("is quicker off the mark with pace", () => {
    expect(timeTo(runner("winger"), 5)).toBeLessThan(timeTo(runner("keeper"), 5));
  });

  it("cannot turn sharply at full speed: it runs a curve and slows into the cut", () => {
    const a = runner();
    a.vel = { x: topSpeed(a), z: 0 };
    let maxLateral = 0;
    for (let t = 0; t < 0.3; t += STEP) {
      const before = { ...a.vel };
      moveAthlete(a, { x: 0, z: 1 }, STEP, false);
      const speed = len(before);
      // Acceleration across the old heading never beats the grip.
      const across = Math.abs((a.vel.z - before.z) * (before.x / speed) - (a.vel.x - before.x) * (before.z / speed)) / STEP;
      maxLateral = Math.max(maxLateral, across);
    }
    expect(maxLateral).toBeLessThanOrEqual(RUN.grip + 1e-6);
    expect(len(a.vel)).toBeLessThan(topSpeed(a) * 0.8);
    // Still carrying on along x for a while: momentum.
    expect(a.pos.x).toBeGreaterThan(1.2);
  });

  it("stops and comes back on a reversal, overshooting by its braking distance", () => {
    const a = runner();
    const v = topSpeed(a);
    a.vel = { x: v, z: 0 };
    let furthest = 0;
    for (let t = 0; t < 2; t += STEP) {
      moveAthlete(a, { x: -1, z: 0 }, STEP, false);
      furthest = Math.max(furthest, a.pos.x);
    }
    expect(furthest).toBeGreaterThan((v * v) / (2 * RUN.brake) * 0.8);
    expect(furthest).toBeLessThan((v * v) / (2 * RUN.brake) * 1.4);
    expect(a.vel.x).toBeLessThan(-2);
  });
});

describe("bodies meeting", () => {
  it("weighs the builds: a centre back is far heavier than a playmaker", () => {
    expect(bodyMass(runner("defender"))).toBeGreaterThan(88);
    expect(bodyMass(runner("playmaker"))).toBeLessThan(70);
  });

  it("lets a big man running in knock a slight one back, and keeps the momentum", () => {
    const big = makeAthlete(0, 0, 0, "defender", null);
    const small = makeAthlete(1, 1, 0, "playmaker", null);
    big.pos = { x: 0, z: 0 };
    big.vel = { x: 6, z: 0 };
    small.pos = { x: 0.55, z: 0 };
    small.vel = { x: 0, z: 0 };
    const before = bracedMass(big) * big.vel.x + bracedMass(small) * small.vel.x;
    const shoves = collideBodies([big, small]);
    const after = bracedMass(big) * big.vel.x + bracedMass(small) * small.vel.x;
    expect(after).toBeCloseTo(before, 6);
    expect(small.vel.x).toBeGreaterThan(big.vel.x);
    expect(small.vel.x).toBeGreaterThan(3.5);
    expect(big.vel.x).toBeLessThan(4);
    expect(shoves.get(1)!).toBeGreaterThan(shoves.get(0)!);
  });

  it("lets the stronger of two equal bodies give less ground", () => {
    const strong = makeAthlete(0, 0, 0, "striker", null);
    const weak = makeAthlete(1, 1, 0, "striker", null);
    weak.attrs = { ...weak.attrs, strength: 0.5 };
    strong.pos = { x: 0, z: 0 };
    weak.pos = { x: 0.4, z: 0 };
    collideBodies([strong, weak]);
    expect(Math.abs(strong.pos.x)).toBeLessThan(Math.abs(weak.pos.x - 0.4));
  });
});
