import { describe, expect, it } from "vitest";
import { createAthlete, moveAthlete, topSpeed } from "./athlete";
import type { MatchEvent } from "./events";
import { STEP } from "./tuning";
import type { Athlete } from "./types";

/** A runner in open space in the middle of the floor. */
function runner(): Athlete {
  const a = createAthlete(0, 0, 0, "shooter", null);
  Object.assign(a, { x: -6, z: 6, yaw: Math.PI / 2 });
  return a;
}

/** Runs with the stick held until `done` says stop, and returns how long it took. */
function runUntil(a: Athlete, stick: { x: number; z: number }, done: (a: Athlete) => boolean, events: MatchEvent[] = [], hasBall = false): number {
  a.move = stick;
  let t = 0;
  while (!done(a) && t < 3) {
    moveAthlete(a, STEP, hasBall, null, events);
    t += STEP;
  }
  return t;
}

/** Runs with the stick held for a while: long enough to reach top speed, short of the sideline. */
function runFor(a: Athlete, stick: { x: number; z: number }, seconds: number): void {
  a.move = stick;
  for (let t = 0; t < seconds; t += STEP) moveAthlete(a, STEP, false, null, []);
}

const speedOf = (a: Athlete) => Math.hypot(a.vx, a.vz);

describe("running with momentum", () => {
  it("bursts off the mark but builds up to top speed over most of a second", () => {
    const a = runner();
    const top = topSpeed(a, false);
    const first = runUntil(a, { x: 1, z: 0 }, (p) => speedOf(p) >= top * 0.3);
    expect(first).toBeLessThan(0.2);
    const full = runUntil(runner(), { x: 1, z: 0 }, (p) => speedOf(p) >= top * 0.95);
    expect(full).toBeGreaterThan(0.55);
    expect(full).toBeLessThan(1.1);
  });

  it("slows over a step or two once the stick is let go", () => {
    const a = runner();
    runFor(a, { x: 1, z: 0 }, 1.2);
    const stop = runUntil(a, { x: 0, z: 0 }, (p) => speedOf(p) < 0.05);
    expect(stop).toBeGreaterThan(0.25);
    expect(stop).toBeLessThan(0.6);
  });

  it("gets a light guard going quicker than a heavy big man", () => {
    const light = createAthlete(0, 0, 0, "shooter", null);
    const heavy = createAthlete(1, 0, 1, "big", null);
    for (const a of [light, heavy]) Object.assign(a, { x: -6, z: 6, yaw: Math.PI / 2 });
    const tLight = runUntil(light, { x: 1, z: 0 }, (p) => speedOf(p) >= 3);
    const tHeavy = runUntil(heavy, { x: 1, z: 0 }, (p) => speedOf(p) >= 3);
    expect(tHeavy).toBeGreaterThan(tLight);
  });

  it("takes the ball handler longer to change direction than a runner without it", () => {
    const turn = (hasBall: boolean) => {
      const a = runner();
      a.move = { x: 1, z: 0 };
      for (let t = 0; t < 1.2; t += STEP) moveAthlete(a, STEP, hasBall, null, []);
      return runUntil(a, { x: 0, z: -1 }, (p) => p.vz < -2.5, [], hasBall);
    };
    expect(turn(true)).toBeGreaterThan(turn(false) * 1.15);
  });

  it("plants and cuts on a reversal instead of snapping round, with a squeak", () => {
    const a = runner();
    runFor(a, { x: 1, z: 0 }, 0.9);
    const events: MatchEvent[] = [];
    let slowest = Infinity;
    let planted = false;
    runUntil(
      a,
      { x: -1, z: 0 },
      (p) => {
        slowest = Math.min(slowest, speedOf(p));
        planted ||= p.plant > 0;
        return p.vx < -3;
      },
      events,
    );
    expect(planted).toBe(true);
    // It had to come to a near stop on the way through.
    expect(slowest).toBeLessThan(1);
    expect(events.some((e) => e.type === "squeak")).toBe(true);
  });

  it("curves through a right angle rather than turning on the spot", () => {
    const a = runner();
    runFor(a, { x: 1, z: 0 }, 0.9);
    const startX = a.x;
    runUntil(a, { x: 0, z: -1 }, (p) => p.vz < -3);
    // It carried on the old way for a while as it turned.
    expect(a.x - startX).toBeGreaterThan(0.4);
  });

  it("is a little slower with the ball", () => {
    const a = runner();
    expect(topSpeed(a, true)).toBeLessThan(topSpeed(a, false));
    const free = runUntil(runner(), { x: 1, z: 0 }, (p) => speedOf(p) >= 4.5);
    const dribbling = runUntil(runner(), { x: 1, z: 0 }, (p) => speedOf(p) >= 4.5, [], true);
    expect(dribbling).toBeGreaterThan(free);
  });
});
