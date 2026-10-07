import { describe, expect, it } from "vitest";
import type { BallBody } from "../physics/air";
import { stepBall, type Contact } from "../physics/world";
import { seeded } from "../rng";
import { COURT, STEP } from "../tuning";
import type { Match } from "../match";
import { applyHit, presetName } from "./hit";

/** Just the dice, which is all a hit needs from the match. */
const dice = (seed: number) => ({ rng: seeded(seed) }) as unknown as Match;

function fly(body: BallBody, seconds: number): Contact[] {
  const all: Contact[] = [];
  for (let t = 0; t < seconds; t += STEP) stepBall(body, STEP, all);
  return all;
}

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

  it("spike it down hard and out of bounds over the nearest line", () => {
    for (let seed = 1; seed < 6; seed++) {
      const body: BallBody = { pos: { x: 4.5, y: 3, z: 4 }, vel: { x: -1, y: 1, z: -4 }, w: { x: 0, y: 0, z: 0 } };
      applyHit(dice(seed), body, "spike");
      expect(body.vel.y).toBeLessThan(-2);
      fly(body, 1.2);
      expect(Math.abs(body.pos.x) > COURT.halfWidth || body.pos.z < 0).toBe(true);
    }
  });

  it("swat it back out toward the floor and the middle, and only knock a tip short", () => {
    const body: BallBody = { pos: { x: 0, y: 3, z: 5 }, vel: { x: 0, y: 3, z: -6 }, w: { x: 0, y: 0, z: 0 } };
    applyHit(dice(2), body, "swat");
    expect(body.vel.z).toBeGreaterThan(0);
    const tip: BallBody = { pos: { x: 0, y: 3, z: 5 }, vel: { x: 0, y: 3, z: -6 }, w: { x: 0, y: 0, z: 0 } };
    applyHit(dice(2), tip, "tip");
    expect(tip.vel.z).toBeLessThan(0);
    expect(Math.abs(tip.vel.z)).toBeLessThan(6);
  });

  it("name the block by its hit when it is special, else by the jump", () => {
    expect(presetName("chase", "pin", "layup")).toBe("pin");
    expect(presetName("chase", "swat", "layup")).toBe("chase");
    expect(presetName("stand", "swat", "layup")).toBe("layup");
    expect(presetName("help", "swat", "jumper")).toBe("help");
    expect(presetName("run", "spike", "jumper")).toBe("spike");
  });
});
