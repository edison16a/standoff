import { describe, expect, it } from "vitest";
import { Gun } from "./gun";
import { WEAPON_IDS, WEAPONS, weaponBars } from "./weapons";

describe("a gun", () => {
  it("caps the rate of fire", () => {
    const gun = new Gun("rifle");
    expect(gun.trigger(0)).toBe("fired");
    expect(gun.trigger(0.01)).toBe("wait");
    expect(gun.trigger(1 / WEAPONS.rifle.rate)).toBe("fired");
  });

  it("empties, clicks and reloads on its own", () => {
    const gun = new Gun("ak47");
    let t = 0;
    for (let i = 0; i < WEAPONS.ak47.magazine; i++) {
      expect(gun.trigger(t)).toBe("fired");
      t += 1;
    }
    expect(gun.ammo).toBe(0);
    expect(gun.reloading).toBe(true);
    expect(gun.trigger(t)).toBe("dry");
    const events = gun.update(WEAPONS.ak47.reload + 0.01);
    expect(events.map((e) => e.type)).toEqual(["reload-start", "reloaded"]);
    expect(gun.ammo).toBe(WEAPONS.ak47.magazine);
  });

  it("loads the shotgun shell by shell and can fire mid reload", () => {
    const gun = new Gun("shotgun");
    gun.trigger(0);
    gun.trigger(1);
    expect(gun.ammo).toBe(4);
    expect(gun.startReload()).toBe(true);
    const events = gun.update(0.35 + 0.42 + 0.01);
    expect(events.filter((e) => e.type === "shell")).toHaveLength(1);
    expect(gun.ammo).toBe(5);
    expect(gun.trigger(5)).toBe("fired");
    expect(gun.reloading).toBe(false);
  });

  it("clicks once when empty, then stays quiet while a held trigger waits out the reload", () => {
    const gun = new Gun("smg");
    let t = 0;
    for (let i = 0; i < WEAPONS.smg.magazine; i++, t += 1) gun.trigger(t);
    expect(gun.trigger(t)).toBe("dry");
    const pulls = [];
    for (let k = 1; k <= 12; k++) pulls.push(gun.trigger(t + k * 0.1));
    expect(pulls.every((p) => p === "wait")).toBe(true);
    gun.update(WEAPONS.smg.reload + 0.01);
    expect(gun.trigger(t + 5)).toBe("fired");
  });

  it("does not reload a full gun", () => {
    expect(new Gun("smg").startReload()).toBe(false);
  });
});

describe("the weapon card", () => {
  it("gives every gun a genuinely different profile", () => {
    const bars = WEAPON_IDS.map((id) => JSON.stringify(weaponBars(id)));
    expect(new Set(bars).size).toBe(WEAPON_IDS.length);
    for (const id of WEAPON_IDS) {
      for (const value of Object.values(weaponBars(id))) {
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});
