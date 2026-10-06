import { describe, expect, it } from "vitest";
import type { BuildId } from "../../builds";
import { createAthlete, moveAthlete, topSpeed } from "../athlete";
import { STEP } from "../tuning";
import { sizeEdge } from "./mass";

/** Runs a player from a standstill straight down the floor and says when he passed `metres`, and how fast he was going. */
function sprint(build: BuildId, metres: number, ball = false): { time: number; speed: number } {
  const a = createAthlete(0, 0, 0, build, null);
  Object.assign(a, { x: -7, z: 1, yaw: Math.PI / 2, move: { x: 1, z: 0 } });
  let t = 0;
  while (a.x + 7 < metres && t < 10) {
    moveAthlete(a, STEP, ball, null, []);
    t += STEP;
  }
  return { time: t, speed: Math.hypot(a.vx, a.vz) };
}

describe("small players are faster", () => {
  it("gives the guards the edge and the big man the least", () => {
    expect(sizeEdge({ build: "playmaker" })).toBeGreaterThan(1.05);
    expect(sizeEdge({ build: "shooter" })).toBeGreaterThan(1.03);
    expect(sizeEdge({ build: "big" })).toBeLessThan(1);
  });

  it("gives a guard a clearly higher top speed than any big, and keeps it sane", () => {
    const guard = topSpeed(createAthlete(0, 0, 0, "playmaker", null), false);
    const dunker = topSpeed(createAthlete(0, 0, 0, "dunker", null), false);
    const big = topSpeed(createAthlete(0, 0, 0, "big", null), false);
    expect(guard).toBeGreaterThan(dunker * 1.08);
    expect(guard).toBeGreaterThan(big * 1.3);
    expect(guard).toBeLessThan(7.5);
    expect(big).toBeGreaterThan(4.2);
  });

  it("gets a guard down the floor first, with the ball too", () => {
    for (const ball of [false, true]) {
      const guard = sprint("playmaker", 12, ball);
      const dunker = sprint("dunker", 12, ball);
      const big = sprint("big", 12, ball);
      expect(guard.time).toBeLessThan(dunker.time - 0.08);
      expect(dunker.time).toBeLessThan(big.time);
    }
  });

  it("is quicker off the mark: a guard is faster after a few steps", () => {
    expect(sprint("playmaker", 3).speed).toBeGreaterThan(sprint("big", 3).speed);
    expect(sprint("shooter", 3).speed).toBeGreaterThan(sprint("lockdown", 3).speed);
  });
});
