import { describe, expect, it } from "vitest";
import { WEAPONS, type WeaponId } from "../../engine/weapons";
import { BarrelHeat, MAX_HEAT, SMOKING, wispRate } from "./heat";

/** Holds the trigger for `seconds` at the gun's rate, at 60 frames a second. Returns the wisps let off. */
function burst(heat: BarrelHeat, weapon: WeaponId, seconds: number): number {
  const dt = 1 / 60;
  const every = 1 / WEAPONS[weapon].rate;
  let wisps = 0;
  let next = 0;
  for (let t = 0; t < seconds; t += dt) {
    while (next <= t) {
      heat.shot(weapon);
      next += every;
    }
    wisps += heat.step(dt);
  }
  return wisps;
}

describe("barrel heat", () => {
  it("does not smoke after a single shot from any gun", () => {
    for (const weapon of Object.keys(WEAPONS) as WeaponId[]) {
      const heat = new BarrelHeat();
      heat.shot(weapon);
      expect(heat.heat).toBeLessThan(SMOKING);
    }
  });

  it("smokes after a second or two of sustained fire", () => {
    for (const weapon of ["smg", "rifle", "ak47"] as const) {
      const heat = new BarrelHeat();
      expect(burst(heat, weapon, 2.5)).toBeGreaterThan(0);
    }
  });

  it("smokes after a few quick shotgun blasts", () => {
    const heat = new BarrelHeat();
    for (let i = 0; i < 3; i++) heat.shot("shotgun");
    expect(heat.heat).toBeGreaterThan(SMOKING);
  });

  it("caps the heat and cools to a stop within seconds", () => {
    const heat = new BarrelHeat();
    burst(heat, "smg", 10);
    expect(heat.heat).toBeLessThanOrEqual(MAX_HEAT);
    let wisps = 0;
    for (let t = 0; t < 8; t += 1 / 60) wisps += heat.step(1 / 60);
    expect(wisps).toBeGreaterThan(0);
    expect(heat.heat).toBeLessThan(SMOKING);
    expect(heat.step(1 / 60)).toBe(0);
  });

  it("lets off the same wisps whatever the frame rate", () => {
    const count = (dt: number) => {
      const heat = new BarrelHeat();
      heat.heat = MAX_HEAT;
      let wisps = 0;
      for (let t = 0; t < 1; t += dt) wisps += heat.step(dt);
      return wisps;
    };
    expect(Math.abs(count(1 / 30) - count(1 / 144))).toBeLessThanOrEqual(2);
  });

  it("smokes harder the hotter the barrel", () => {
    expect(wispRate(SMOKING)).toBe(0);
    expect(wispRate(MAX_HEAT)).toBeGreaterThan(wispRate(SMOKING + 0.1));
  });
});
