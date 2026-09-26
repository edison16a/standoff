import { describe, expect, it } from "vitest";
import { Gun } from "./gun-state";
import { falloffDamage, gunBars, GUN_IDS, GUNS } from "./guns";
import { Rng } from "./rng";

const rng = () => new Rng(7);

/** Pulls the trigger every step for `seconds`, counting shots. */
function hold(gun: Gun, seconds: number, start = 0, r = rng()): number {
  let shots = 0;
  for (let t = start; t < start + seconds; t += 1 / 60) {
    if (gun.trigger(t, r) === "fired") shots += 1;
    gun.update(1 / 60);
  }
  return shots;
}

describe("the four guns", () => {
  it("differ in damage, rate, magazine, reload, spread, range and kick", () => {
    for (const key of ["rate", "magazine", "reload", "spread"] as const) {
      expect(new Set(GUN_IDS.map((g) => GUNS[g][key])).size).toBe(4);
    }
    expect(new Set(GUN_IDS.map((g) => GUNS[g].falloff.start)).size).toBe(4);
    expect(new Set(GUN_IDS.map((g) => GUNS[g].recoil.pitch)).size).toBe(4);
    expect(GUNS.rifle.auto && GUNS.smg.auto).toBe(true);
    expect(GUNS.shotgun.auto || GUNS.sniper.auto).toBe(false);
  });

  it("lose damage with range, down to a floor", () => {
    const rifle = GUNS.rifle;
    expect(falloffDamage(rifle, 5)).toBe(rifle.damage);
    expect(falloffDamage(rifle, rifle.falloff.end + 50)).toBeCloseTo(rifle.damage * rifle.falloff.min);
    const mid = falloffDamage(rifle, (rifle.falloff.start + rifle.falloff.end) / 2);
    expect(mid).toBeLessThan(rifle.damage);
    expect(mid).toBeGreaterThan(rifle.damage * rifle.falloff.min);
    // The shotgun falls off hardest, the sniper hardly at all.
    expect(falloffDamage(GUNS.shotgun, 25) / GUNS.shotgun.damage).toBeLessThan(0.4);
    expect(falloffDamage(GUNS.sniper, 50)).toBe(GUNS.sniper.damage);
  });

  it("have play styles that match their stats", () => {
    const close = (g: (typeof GUNS)["rifle"]) => falloffDamage(g, 4) * g.pellets;
    // Only the shotgun downs a player with one shot up close; the sniper does it with a head shot.
    expect(close(GUNS.shotgun)).toBeGreaterThanOrEqual(100);
    expect(GUNS.sniper.damage * GUNS.sniper.head).toBeGreaterThanOrEqual(100);
    expect(GUNS.sniper.damage).toBeLessThan(100);
    expect(GUNS.smg.speed).toBe(Math.max(...GUN_IDS.map((g) => GUNS[g].speed)));
    for (const g of GUN_IDS) expect(GUNS[g].head).toBeGreaterThan(1);
  });

  it("show bars between 0 and 1 for the phone's gun card", () => {
    for (const g of GUN_IDS) for (const v of Object.values(gunBars(g))) expect(v).toBeGreaterThan(0), expect(v).toBeLessThanOrEqual(1);
    expect(gunBars("smg").rate).toBeCloseTo(1);
    expect(gunBars("sniper").range).toBeCloseTo(1);
  });
});

describe("a gun in hand", () => {
  it("fires no faster than its rate", () => {
    const gun = new Gun("smg");
    const shots = hold(gun, 1);
    expect(shots).toBeLessThanOrEqual(Math.ceil(GUNS.smg.rate));
    expect(shots).toBeGreaterThanOrEqual(Math.floor(GUNS.smg.rate) - 1);
  });

  it("empties its magazine, clicks once, reloads by itself and fires again", () => {
    const gun = new Gun("rifle");
    const r = rng();
    let t = 0;
    let fired = 0;
    while (gun.ammo > 0) {
      if (gun.trigger(t, r) === "fired") fired += 1;
      gun.update(0.2);
      t += 0.2;
    }
    expect(fired).toBe(GUNS.rifle.magazine);
    expect(gun.reloading).toBe(true);
    expect(gun.update(0).some((e) => e.type === "reload-start")).toBe(false);
    const results = [gun.trigger(t, r), gun.trigger(t + 0.5, r)];
    // A held trigger on an empty gun clicks once, then stays quiet through the reload.
    expect(results).toEqual(["dry", "wait"]);
    const events = [];
    for (let i = 0; i < 200; i++) events.push(...gun.update(1 / 60));
    expect(events.some((e) => e.type === "reloaded")).toBe(true);
    expect(gun.ammo).toBe(GUNS.rifle.magazine);
    expect(gun.trigger(t + 10, r)).toBe("fired");
  });

  it("gives one dry click on a gun that is reloading", () => {
    const gun = new Gun("smg");
    gun.ammo = 3;
    expect(gun.startReload()).toBe(true);
    expect(gun.trigger(0, rng())).toBe("dry");
    expect(gun.trigger(1, rng())).toBe("wait");
    expect(gun.reloadLeftSeconds).toBeGreaterThan(0);
  });

  it("loads the shotgun shell by shell and lets it fire mid reload", () => {
    const gun = new Gun("shotgun");
    gun.ammo = 2;
    gun.startReload();
    const events = [];
    for (let i = 0; i < 60; i++) events.push(...gun.update(1 / 60));
    const shells = events.filter((e) => e.type === "shell").length;
    expect(shells).toBeGreaterThanOrEqual(1);
    expect(gun.ammo).toBe(2 + shells);
    expect(gun.trigger(5, rng())).toBe("fired");
    expect(gun.reloading).toBe(false);
  });

  it("kicks up and sideways with each shot, capped, and settles back", () => {
    const gun = new Gun("rifle");
    hold(gun, 0.2);
    const after = gun.kick.pitch;
    expect(after).toBeGreaterThan(GUNS.rifle.recoil.pitch * 0.8);
    hold(gun, 1.5, 1);
    expect(gun.kick.pitch).toBeLessThanOrEqual(GUNS.rifle.recoil.max + 1e-9);
    expect(Math.abs(gun.kick.yaw)).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) gun.update(1 / 60);
    expect(gun.kick.pitch).toBeLessThan(0.01);
    expect(gun.bloom).toBeLessThan(0.001);
  });

  it("kicks the sniper hardest per shot", () => {
    const kicks = GUN_IDS.map((id) => {
      const gun = new Gun(id);
      gun.trigger(0, rng());
      return gun.kick.pitch;
    });
    expect(Math.max(...kicks)).toBe(kicks[GUN_IDS.indexOf("sniper")]);
  });

  it("comes back full and still for a new round", () => {
    const gun = new Gun("smg");
    hold(gun, 0.5);
    gun.refill();
    expect(gun.ammo).toBe(GUNS.smg.magazine);
    expect(gun.kick).toEqual({ pitch: 0, yaw: 0 });
    expect(gun.reloading).toBe(false);
    expect(gun.trigger(0, rng())).toBe("fired");
  });
});
