import { describe, expect, it } from "vitest";
import { WEAPONS } from "./weapons";
import { hitZombie, makeZombie, stepZombie, weakLeft } from "./zombie";
import { KINDS, weakPointHp, type ZombieKind } from "./zombie-kinds";

const make = (kind: ZombieKind, hpScale = 1, ahead = 20) =>
  makeZombie(1, kind, ahead, 0, 0, { hpScale, speedScale: 1, harm: 1, weakHp: weakPointHp(kind, 1), seed: 0.5 });

describe("hurting zombies", () => {
  it("drops a walker with any single bullet, anywhere", () => {
    for (const weapon of ["smg", "rifle", "ak47"] as const) {
      for (const part of ["body", "limb", "head"] as const) {
        expect(hitZombie(make("walker"), part, null, WEAPONS[weapon].damage).killed).toBe(true);
      }
    }
  });

  it("makes a brute take two body hits or one to the head", () => {
    const brute = make("brute");
    expect(hitZombie(brute, "body", null, WEAPONS.rifle.damage).killed).toBe(false);
    expect(hitZombie(brute, "body", null, WEAPONS.rifle.damage).killed).toBe(true);
    expect(hitZombie(make("brute"), "head", null, WEAPONS.smg.damage).killed).toBe(true);
  });

  it("lets armour soak body hits but not head shots", () => {
    const riot = make("armored");
    const hit = hitZombie(riot, "body", null, WEAPONS.rifle.damage);
    expect(hit.blocked).toBe(true);
    expect(hit.killed).toBe(false);
    expect(hitZombie(make("armored"), "head", null, WEAPONS.smg.damage).killed).toBe(true);
  });

  it("needs two SMG rounds for a late walker, but one AK round", () => {
    expect(hitZombie(make("walker", 1.4), "body", null, WEAPONS.smg.damage).killed).toBe(false);
    expect(hitZombie(make("walker", 1.4), "body", null, WEAPONS.ak47.damage).killed).toBe(true);
  });

  it("only hurts a boss through its weak points, and drops it when all are broken", () => {
    const boss = make("butcher");
    expect(hitZombie(boss, "head", null, 5).blocked).toBe(true);
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
