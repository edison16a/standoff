import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { Ball } from "../engine/types";
import type { AthleteView } from "./athlete-view";
import { ReleaseRoll, ROLL_TIME, rollShare } from "./release-roll";

/** A shooter whose right palm is at a fixed point. */
const PALM = new THREE.Vector3(0, 2.4, 6);
const shooter = { hand: (_s: "L" | "R", out: THREE.Vector3) => out.copy(PALM) } as unknown as AthleteView;

function ballInFlight(): Ball {
  return { holder: null, mode: "flight", shot: { kind: "jumper", shooter: 0 } } as unknown as Ball;
}

describe("the ball rolling off the fingers", () => {
  it("eases from 0 at the release to 1 once clear, with no jump at either end", () => {
    expect(rollShare(0)).toBe(0);
    expect(rollShare(ROLL_TIME)).toBe(1);
    expect(rollShare(ROLL_TIME * 2)).toBe(1);
    expect(rollShare(ROLL_TIME * 0.02)).toBeLessThan(0.01);
    expect(rollShare(ROLL_TIME * 0.98)).toBeGreaterThan(0.99);
  });

  it("starts on the fingers and ends on the engine's ball", () => {
    const roll = new ReleaseRoll();
    const ball = ballInFlight();
    const engine = new THREE.Vector3(0.3, 2.9, 5.6);
    const first = engine.clone();
    roll.apply(ball, shooter, first, 1 / 60);
    expect(first.distanceTo(PALM)).toBeLessThan(0.15);
    let late = engine.clone();
    for (let t = 0; t < ROLL_TIME + 0.05; t += 1 / 60) {
      late = engine.clone();
      roll.apply(ball, shooter, late, 1 / 60);
    }
    expect(late.distanceTo(engine)).toBeLessThan(1e-9);
  });

  it("leaves a pass, a held ball and a dunk alone", () => {
    const roll = new ReleaseRoll();
    const engine = new THREE.Vector3(1, 1, 1);
    for (const ball of [
      { ...ballInFlight(), holder: 2 },
      { ...ballInFlight(), shot: null },
      { ...ballInFlight(), shot: { kind: "dunk", shooter: 0 } },
    ] as unknown as Ball[]) {
      const t = engine.clone();
      roll.apply(ball, shooter, t, 1 / 60);
      expect(t.equals(engine)).toBe(true);
    }
  });
});
