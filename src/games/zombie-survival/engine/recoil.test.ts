import { describe, expect, it } from "vitest";
import { Recoil } from "./recoil";
import { WEAPONS } from "./weapons";

const middle = () => 0.5;

/** Steps a recoil by `seconds` in frames of `dt`. */
function settle(recoil: Recoil, seconds: number, dt = 1 / 60): void {
  for (let t = 0; t < seconds; t += dt) recoil.update(dt);
}

describe("recoil", () => {
  it("kicks the gun up on each shot and springs it back to where the player points", () => {
    const recoil = new Recoil(WEAPONS.rifle.recoil);
    recoil.kick(middle);
    expect(recoil.y).toBeGreaterThan(0);
    settle(recoil, 0.03);
    // The rest of the kick carries the muzzle on up for a moment.
    const peak = recoil.y;
    expect(peak).toBeGreaterThan(WEAPONS.rifle.recoil.up * 0.7);
    settle(recoil, 1);
    expect(recoil.size).toBeLessThan(1e-4);
  });

  it("never swings past the aim on the way back", () => {
    const recoil = new Recoil(WEAPONS.ak47.recoil);
    recoil.kick(middle);
    for (let t = 0; t < 2; t += 1 / 60) {
      recoil.update(1 / 60);
      expect(recoil.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("stays stable however long a frame is", () => {
    const recoil = new Recoil(WEAPONS.shotgun.recoil);
    recoil.kick(middle);
    recoil.update(0.3);
    expect(Number.isFinite(recoil.y)).toBe(true);
    recoil.update(5);
    expect(recoil.size).toBeLessThan(1e-6);
  });

  it("climbs under a held trigger, but only so far", () => {
    const spec = WEAPONS.ak47;
    const recoil = new Recoil(spec.recoil);
    let highest = 0;
    for (let shot = 0; shot < 30; shot++) {
      recoil.kick(middle);
      highest = Math.max(highest, recoil.size);
      settle(recoil, 1 / spec.rate);
    }
    expect(highest).toBeGreaterThan(spec.recoil.up * 1.4);
    expect(highest).toBeLessThanOrEqual(spec.recoil.max + 1e-9);
  });

  it("lets a shotgun settle before the next pump, but not an AK held down", () => {
    const left = (id: "shotgun" | "ak47") => {
      const recoil = new Recoil(WEAPONS[id].recoil);
      recoil.kick(middle);
      settle(recoil, 1 / WEAPONS[id].rate);
      return recoil.size / WEAPONS[id].recoil.up;
    };
    expect(left("shotgun")).toBeLessThan(0.1);
    expect(left("ak47")).toBeGreaterThan(0.3);
  });

  it("jolts left or right at random, the same for the same numbers", () => {
    const a = new Recoil(WEAPONS.smg.recoil);
    const b = new Recoil(WEAPONS.smg.recoil);
    a.kick(() => 0.9);
    b.kick(() => 0.1);
    expect(Math.sign(a.x)).toBe(-Math.sign(b.x));
    const c = new Recoil(WEAPONS.smg.recoil);
    c.kick(() => 0.9);
    expect(c.offset).toEqual(a.offset);
  });
});
