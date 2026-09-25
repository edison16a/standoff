import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import { launchSpeed } from "./knockback";
import { MOVE_KEYS, MOVESETS, type Moveset } from "./moves";

/** The furthest any live box reaches in front, with lunges and bolts counted. */
function reach(set: Moveset): number {
  let best = 0;
  for (const move of Object.values(set)) {
    for (const b of move.hitboxes) best = Math.max(best, b.x + b.r);
    for (const p of move.projectiles ?? []) best = Math.max(best, p.x + (p.vx * p.life) / 60);
  }
  return best;
}

/** The ground Attack 1 moves' reach, without heavies or ults. */
function lightReach(set: Moveset): number {
  return Math.max(...(["jab", "side", "down"] as const).map((k) => Math.max(...set[k].hitboxes.map((b) => b.x + b.r))));
}

/** The hardest launch any non ult move gives at 100 percent. */
function power(set: Moveset): number {
  let best = 0;
  for (const [key, move] of Object.entries(set)) {
    if (key === "ult") continue;
    for (const b of move.hitboxes) best = Math.max(best, launchSpeed(b, 100, 100));
  }
  return best;
}

describe("the movesets", () => {
  it("give every fighter every move: four ground, three air, four heavy and an ult", () => {
    for (const id of CHARACTER_IDS) {
      expect(Object.keys(MOVESETS[id]).sort()).toEqual([...MOVE_KEYS].sort());
    }
  });

  it("keep every hitbox and projectile inside its move's frames", () => {
    for (const id of CHARACTER_IDS) {
      for (const [key, move] of Object.entries(MOVESETS[id])) {
        expect(move.hitboxes.length + (move.projectiles?.length ?? 0), `${id} ${key}`).toBeGreaterThan(0);
        for (const b of move.hitboxes) {
          expect(b.from).toBeGreaterThanOrEqual(1);
          expect(b.to).toBeGreaterThanOrEqual(b.from);
          expect(b.to, `${id} ${key}`).toBeLessThanOrEqual(move.frames);
          expect(b.r).toBeGreaterThan(0);
          expect(b.damage).toBeGreaterThan(0);
        }
        for (const p of move.projectiles ?? []) expect(p.frame).toBeLessThanOrEqual(move.frames);
      }
    }
  });

  it("make the up heavy a recovery that rises, and the ult unblockable", () => {
    for (const id of CHARACTER_IDS) {
      const up = MOVESETS[id].heavyUp;
      expect(up.recovery).toBe(true);
      expect(Math.max(...(up.motion ?? []).map((m) => m.vy ?? 0))).toBeGreaterThan(14);
      expect(MOVESETS[id].ult.unblockable).toBe(true);
      expect(MOVESETS[id].ult.invincible).toBeDefined();
    }
  });

  it("give down aerials a spike and aerials landing lag", () => {
    for (const id of CHARACTER_IDS) {
      expect(Math.min(...MOVESETS[id].airDown.hitboxes.map((b) => b.angle))).toBeLessThan(-60);
      for (const key of ["air", "airUp", "airDown"] as const) expect(MOVESETS[id][key].landLag).toBeGreaterThan(0);
    }
  });

  it("play each fighter to type", () => {
    const { karate, samurai, mage, bear } = MOVESETS;
    // Karate is the fastest, the Samurai reaches furthest with a blade, the Mage furthest of all, and the Bear hits hardest.
    expect(karate.jab.frames).toBeLessThan(Math.min(samurai.jab.frames, mage.jab.frames, bear.jab.frames));
    expect(lightReach(samurai)).toBeGreaterThan(Math.max(lightReach(karate), lightReach(bear)));
    expect(reach(mage)).toBeGreaterThan(Math.max(reach(karate), reach(samurai), reach(bear)));
    expect(power(bear)).toBeGreaterThan(Math.max(power(karate), power(samurai), power(mage)));
    expect(mage.heavy.projectiles?.length).toBeGreaterThan(0);
  });
});
