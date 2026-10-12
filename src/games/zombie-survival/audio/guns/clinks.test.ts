import { describe, expect, it } from "vitest";
import { CASINGS, CasingBody, casingSeed, EJECT_HEIGHT, ejectDelay } from "../../ballistics";
import { Rng } from "../../engine/rng";
import { WEAPON_IDS } from "../../engine/weapons";
import { casingClinks, clinkLevel } from "./clinks";

describe("case clinks", () => {
  it("land when the renderer's case does, built from the same seed", () => {
    for (const weapon of WEAPON_IDS) {
      // What a renderer does: one Rng from the shot's seed, a body from the shared height, fixed steps.
      const rng = new Rng(casingSeed(2, 17));
      const body = new CasingBody(CASINGS[weapon], EJECT_HEIGHT, () => rng.next());
      const seen: number[] = [];
      while (!body.resting && body.age < 3) {
        const hit = body.step(() => rng.next());
        if (hit) seen.push(ejectDelay(weapon) + hit.time);
      }
      expect(casingClinks(weapon, 2, 17).map((c) => c.at), weapon).toEqual(seen);
    }
  });

  it("start when a case dropped from shoulder height reaches the street", () => {
    for (const weapon of WEAPON_IDS) {
      const first = casingClinks(weapon, 0, 1)[0]!;
      expect(first.at, weapon).toBeGreaterThan(0.35);
      expect(first.at, weapon).toBeLessThan(1);
      expect(first.speed, weapon).toBeGreaterThan(4);
    }
  });

  it("differ from shot to shot and seat to seat", () => {
    const at = (seat: number, shot: number) => casingClinks("rifle", seat, shot)[0]!.at;
    expect(at(0, 1)).not.toBe(at(0, 2));
    expect(at(0, 1)).not.toBe(at(1, 1));
  });

  it("get quieter with each softer bounce, and never louder than full", () => {
    const list = casingClinks("ak47", 3, 9);
    for (let i = 1; i < list.length; i++) expect(clinkLevel(list[i]!.speed)).toBeLessThanOrEqual(clinkLevel(list[i - 1]!.speed));
    expect(clinkLevel(20)).toBe(1);
    expect(clinkLevel(0)).toBe(0);
  });
});
