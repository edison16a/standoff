import { describe, expect, it } from "vitest";
import { Gun } from "./gun";
import { pelletOffsets } from "./shooting";
import { reach, weaponBars, weaponFacts } from "./weapon-card";
import { falloff, WEAPON_IDS, WEAPONS } from "./weapons";

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
    expect(gun.ammo).toBe(WEAPONS.shotgun.magazine - 2);
    expect(gun.startReload()).toBe(true);
    const events = gun.update(0.35 + WEAPONS.shotgun.shell! + 0.01);
    expect(events.filter((e) => e.type === "shell")).toHaveLength(1);
    expect(gun.ammo).toBe(WEAPONS.shotgun.magazine - 1);
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

  it("settles its kick when refilled", () => {
    const gun = new Gun("ak47");
    gun.recoil.kick(() => 0.5);
    expect(gun.recoil.size).toBeGreaterThan(0);
    gun.refill();
    expect(gun.recoil.size).toBe(0);
  });
});

describe("the trade offs between the guns", () => {
  it("fades the shotgun fast with range, the submachine gun less, and never the rifles", () => {
    expect(falloff(WEAPONS.shotgun.range, 5)).toBe(1);
    expect(falloff(WEAPONS.shotgun.range, 20)).toBeLessThan(0.3);
    expect(falloff(WEAPONS.smg.range, 20)).toBeGreaterThan(falloff(WEAPONS.shotgun.range, 20));
    expect(falloff(WEAPONS.smg.range, 30)).toBeLessThan(1);
    for (const id of ["rifle", "ak47"] as const) expect(falloff(WEAPONS[id].range, 35)).toBe(1);
  });

  it("gives the shotgun the widest cone and the rifle the tightest", () => {
    const spread = WEAPON_IDS.map((id) => WEAPONS[id].spread);
    expect(Math.max(...spread)).toBe(WEAPONS.shotgun.spread);
    expect(Math.min(...spread)).toBe(WEAPONS.rifle.spread);
    expect(reach(WEAPONS.shotgun)).toBeLessThan(reach(WEAPONS.smg));
    expect(reach(WEAPONS.smg)).toBeLessThan(reach(WEAPONS.ak47));
    expect(reach(WEAPONS.ak47)).toBeLessThanOrEqual(reach(WEAPONS.rifle));
  });

  it("makes the AK kick hardest and only the AK go through armour", () => {
    for (const id of WEAPON_IDS) {
      if (id === "ak47" || id === "shotgun") continue;
      expect(WEAPONS[id].recoil.up).toBeLessThan(WEAPONS.ak47.recoil.up);
      expect(WEAPONS[id].pierce).toBe(false);
    }
    expect(WEAPONS.ak47.pierce).toBe(true);
  });

  it("hits hardest per shot with the shotgun and fires fastest with the submachine gun", () => {
    const perShot = (id: (typeof WEAPON_IDS)[number]) => WEAPONS[id].damage * WEAPONS[id].pellets;
    expect(Math.max(...WEAPON_IDS.map(perShot))).toBe(perShot("shotgun"));
    expect(Math.max(...WEAPON_IDS.map((id) => WEAPONS[id].rate))).toBe(WEAPONS.smg.rate);
    expect(Math.max(...WEAPON_IDS.map((id) => WEAPONS[id].magazine))).toBe(WEAPONS.smg.magazine);
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

  it("calls the shotgun's range close and the rifle's long", () => {
    expect(weaponFacts("shotgun").range).toBe("Up close");
    expect(weaponFacts("rifle").range).toBe("Long");
    expect(weaponBars("rifle").range).toBe(1);
  });
});

describe("a shot's spread", () => {
  it("keeps every bullet and pellet inside its gun's cone, the size its crosshair shows", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (const id of WEAPON_IDS) {
      for (let shot = 0; shot < 200; shot++) {
        for (const o of pelletOffsets(WEAPONS[id], random)) expect(Math.hypot(o.x, o.y), id).toBeLessThanOrEqual(WEAPONS[id].spread + 1e-12);
      }
    }
  });
});
