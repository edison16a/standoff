import { describe, expect, it } from "vitest";
import { bulletDamage } from "./shooting";
import { WEAPONS } from "./weapons";
import { hitZombie, makeZombie, stepZombie, weakLeft } from "./zombie";
import { BOSS_KINDS, isMiniBoss, KINDS, weakPointHp, type ZombieKind } from "./zombie-kinds";

const make = (kind: ZombieKind, hpScale = 1, ahead = 20) =>
  makeZombie(1, kind, ahead, 0, 0, { hpScale, speedScale: 1, harm: 1, weakHp: weakPointHp(kind, 1), seed: 0.5 });

/** Bullets it takes to drop a fresh zombie of this kind on this part. */
function hitsToKill(kind: ZombieKind, part: "head" | "body" | "limb", damage: number, pierce = false): number {
  const z = make(kind);
  for (let n = 1; n < 50; n++) if (hitZombie(z, part, null, damage, pierce).killed) return n;
  return Infinity;
}

describe("hurting zombies", () => {
  it("drops a walker with one rifle or AK round anywhere, and one light round only up close", () => {
    for (const weapon of ["rifle", "ak47"] as const) {
      for (const part of ["body", "limb", "head"] as const) expect(hitsToKill("walker", part, WEAPONS[weapon].damage)).toBe(1);
    }
    expect(hitsToKill("walker", "body", bulletDamage(WEAPONS.smg, "body", 8))).toBe(1);
    expect(hitsToKill("walker", "body", bulletDamage(WEAPONS.smg, "body", 22))).toBe(2);
    expect(hitsToKill("walker", "head", bulletDamage(WEAPONS.smg, "head", 22))).toBe(1);
  });

  it("makes a brute take a few body hits or one to the head", () => {
    expect(hitsToKill("brute", "body", WEAPONS.rifle.damage)).toBe(3);
    expect(hitsToKill("brute", "body", WEAPONS.ak47.damage)).toBe(2);
    expect(hitsToKill("brute", "head", WEAPONS.rifle.damage)).toBe(1);
    // A whole blast up close drops one outright.
    expect(hitsToKill("brute", "body", WEAPONS.shotgun.damage * WEAPONS.shotgun.pellets)).toBe(1);
  });

  it("lets armour soak body hits but not head shots, or an AK round", () => {
    const riot = make("armored");
    const hit = hitZombie(riot, "body", null, WEAPONS.rifle.damage);
    expect(hit.blocked).toBe(true);
    expect(hit.killed).toBe(false);
    expect(hitsToKill("armored", "head", WEAPONS.smg.damage)).toBe(1);
    const pierced = hitZombie(make("armored"), "body", null, WEAPONS.ak47.damage, WEAPONS.ak47.pierce);
    expect(pierced.blocked).toBe(false);
    expect(pierced.killed).toBe(true);
  });

  it("only hurts a boss through its weak points, and drops it when all are broken", () => {
    const boss = make("butcher");
    expect(hitZombie(boss, "head", null, 5).blocked).toBe(true);
    // Not even an AK round goes through a boss's hide.
    expect(hitZombie(boss, "body", null, 5, true).blocked).toBe(true);
    let broke = 0;
    for (let i = 0; i < KINDS.butcher.weakPoints.length; i++) {
      let result = hitZombie(boss, "weak", i, 1);
      while (result.broke === null && !result.killed) result = hitZombie(boss, "weak", i, 1);
      broke += 1;
    }
    expect(broke).toBe(3);
    expect(weakLeft(boss)).toBe(0);
    expect(boss.state).toBe("dead");
  });

  it("makes mini bosses quicker and lighter than the big ones", () => {
    const minis = BOSS_KINDS.filter(isMiniBoss);
    const bigs = BOSS_KINDS.filter((k) => !isMiniBoss(k));
    expect(minis).toHaveLength(3);
    for (const mini of minis) {
      for (const big of bigs) {
        expect(KINDS[mini].speed).toBeGreaterThan(KINDS[big].speed);
        expect(KINDS[mini].height).toBeLessThan(KINDS[big].height);
        expect(KINDS[mini].weakPoints.length * KINDS[mini].weakHp).toBeLessThan(KINDS[big].weakPoints.length * KINDS[big].weakHp);
      }
    }
  });

  it("walks up, then swings at the team on a steady beat", () => {
    const z = make("walker", 1, 3);
    let harm = 0;
    for (let t = 0; t < 10; t += 1 / 60) harm += stepZombie(z, 1 / 60);
    expect(z.state).toBe("attack");
    expect(harm).toBeGreaterThan(0);
    expect(harm).toBeLessThanOrEqual(KINDS.walker.damage * 7);
  });

  it("stops swinging when the crowd shoves it out of reach, and walks back in", () => {
    const z = make("walker", 1, 3);
    for (let t = 0; t < 3; t += 1 / 60) stepZombie(z, 1 / 60);
    expect(z.state).toBe("attack");
    z.ahead = KINDS.walker.reach + 0.95;
    let harm = 0;
    for (let t = 0; t < 0.4; t += 1 / 60) harm += stepZombie(z, 1 / 60);
    expect(harm).toBe(0);
    expect(z.state).toBe("walk");
    for (let t = 0; t < 3; t += 1 / 60) stepZombie(z, 1 / 60);
    expect(z.state).toBe("attack");
  });
});
