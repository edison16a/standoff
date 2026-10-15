import { describe, expect, it } from "vitest";
import type { BallBody } from "../physics/air";
import { stepBall, type Contact } from "../physics/world";
import { seeded } from "../rng";
import { COURT, RIM, STEP } from "../tuning";
import type { Match } from "../match";
import { applyHit } from "./hit";

/** Just the dice, which is all a hit needs from the match. */
const dice = (seed: number) => ({ rng: seeded(seed) }) as unknown as Match;

function fly(body: BallBody, seconds: number): Contact[] {
  const all: Contact[] = [];
  for (let t = 0; t < seconds; t += STEP) stepBall(body, STEP, all);
  return all;
}

const shotAt = (x: number, y: number, z: number): BallBody => ({ pos: { x, y, z }, vel: { x: 0, y: 3, z: -6 }, w: { x: 0, y: 0, z: 0 } });

describe("block hits", () => {
  it("pin the ball flat to the glass, and it drops off down the face", () => {
    for (let seed = 1; seed < 6; seed++) {
      const body: BallBody = { pos: { x: 0.2, y: 3.3, z: 1.7 }, vel: { x: 0, y: 2, z: -3 }, w: { x: 0, y: 0, z: 0 } };
      applyHit(dice(seed), body, "pin");
      const contacts = fly(body, 0.4);
      expect(contacts.some((c) => c.kind === "board")).toBe(true);
      expect(Math.abs(body.vel.z)).toBeLessThan(2);
    }
  });

  it("stuff a two hand rejection back out and down into the floor of the lane", () => {
    for (let seed = 1; seed < 6; seed++) {
      const body = shotAt(0.3, 3, 2.4);
      applyHit(dice(seed), body, "reject");
      expect(body.vel.y).toBeLessThan(-1.5);
      // Away from the rim: out toward the top of the key.
      expect(body.vel.z).toBeGreaterThan(2);
      const contacts = fly(body, 0.6);
      expect(contacts.some((c) => c.kind === "floor")).toBe(true);
    }
  });

  it("swing a one hand swat rising into the stands over the nearest sideline", () => {
    for (let seed = 1; seed < 8; seed++) {
      const body = shotAt(1.2, 2.9, 4.5);
      applyHit(dice(seed), body, "stands");
      expect(body.vel.y).toBeGreaterThan(2);
      expect(body.vel.x).toBeGreaterThan(8);
      fly(body, 0.9);
      expect(body.pos.x).toBeGreaterThan(COURT.halfWidth);
    }
  });

  it("slap a swat on the way the arm swings, from where the blocker is", () => {
    const body = shotAt(0, 3, 3);
    // The blocker is behind the ball (further from the rim): it goes on toward the baseline.
    applyHit(dice(2), body, "swat", { x: 0, z: 4 });
    expect(body.vel.z).toBeLessThan(0);
    const across = shotAt(0, 3, 3);
    // From the left of it: across to the right.
    applyHit(dice(2), across, "swat", { x: -1.2, z: 3 });
    expect(across.vel.x).toBeGreaterThan(1.5);
  });

  it("knock a closeout back over the shooter, and only knock a tip short", () => {
    const body = shotAt(0, 3, 7);
    applyHit(dice(3), body, "deflect");
    expect(body.vel.z).toBeGreaterThan(0);
    expect(body.vel.y).toBeGreaterThan(1.5);
    const tip = shotAt(0, 3, 5);
    applyHit(dice(2), tip, "tip");
    expect(tip.vel.z).toBeLessThan(0);
    expect(Math.abs(tip.vel.z)).toBeLessThan(6);
  });

  it("slap a pin away when there is no glass behind the ball", () => {
    const body = shotAt(RIM.x + 2, 3, 4);
    applyHit(dice(1), body, "pin", { x: RIM.x + 2, z: 5 });
    fly(body, 0.3);
    expect(body.pos.z).toBeLessThan(4);
  });
});
