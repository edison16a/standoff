import { describe, expect, it } from "vitest";
import { WEAPON_IDS } from "../../engine/weapons";
import { fallAt, GRAVITY, magazineFall } from "./falling";
import { KICKS, RecoilSpring } from "./recoil-spring";

/** A fixed sequence, so the sideways twist is the same every run. */
const steady = () => 0.7;

/** Runs a spring for `seconds` in game sized frames and returns the largest offset seen on each axis. */
function run(spring: RecoilSpring, seconds: number, frame = 1 / 60) {
  const peak = { back: 0, rise: 0, roll: 0, twist: 0 };
  for (let t = 0; t < seconds; t += frame) {
    spring.step(frame);
    const o = spring.offset;
    for (const k of Object.keys(peak) as (keyof typeof peak)[]) peak[k] = Math.max(peak[k], Math.abs(o[k]));
  }
  return peak;
}

describe("the recoil spring", () => {
  it("throws each gun back and up by about its own kick, then settles to rest", () => {
    for (const id of WEAPON_IDS) {
      const spec = KICKS[id];
      const spring = new RecoilSpring(spec, steady);
      spring.kick();
      const peak = run(spring, 0.3, 1 / 240);
      expect(peak.back).toBeGreaterThan(spec.back * 0.8);
      expect(peak.back).toBeLessThan(spec.back * 1.4);
      expect(peak.rise).toBeGreaterThan(spec.rise * 0.7);
      run(spring, 1.5);
      expect(spring.resting).toBe(true);
    }
  });

  it("gives the shotgun the biggest shove and the SMG the smallest", () => {
    expect(KICKS.shotgun.back).toBeGreaterThan(KICKS.ak47.back);
    expect(KICKS.ak47.rise).toBeGreaterThan(KICKS.rifle.rise);
    expect(KICKS.smg.rise).toBeLessThan(KICKS.rifle.rise);
    // The SMG buzzes: it springs back far quicker than the AK climbs.
    expect(KICKS.smg.omega).toBeGreaterThan(KICKS.ak47.omega * 2);
  });

  it("lets the AK climb in a burst while the rifle stays crisp", () => {
    const climb = (id: "ak47" | "rifle", rate: number) => {
      const spring = new RecoilSpring(KICKS[id], steady);
      let top = 0;
      for (let shot = 0; shot < 6; shot++) {
        spring.kick();
        top = Math.max(top, run(spring, 1 / rate).rise);
      }
      return top / KICKS[id].rise;
    };
    expect(climb("ak47", 5.5)).toBeGreaterThan(climb("rifle", 7.5));
  });

  it("is stable however long a frame is", () => {
    const spring = new RecoilSpring(KICKS.smg, steady);
    for (let i = 0; i < 20; i++) spring.kick();
    run(spring, 2, 0.1);
    expect(spring.resting).toBe(true);
  });
});

describe("a dropped magazine", () => {
  const fall = magazineFall([0, -1, 0], [0, -1, 0], steady);

  it("speeds up as it falls, by gravity", () => {
    const y = (t: number) => fallAt(fall, t).offset[1];
    const dt = 0.05;
    const first = y(dt) - y(0);
    const later = y(0.3 + dt) - y(0.3);
    expect(later).toBeLessThan(first);
    // The second difference of a throw under gravity is g dt squared.
    const second = y(0.2) - 2 * y(0.1) + y(0);
    expect(second).toBeCloseTo(-GRAVITY * 0.01, 6);
  });

  it("is out of sight below the gun within half a second", () => {
    expect(fallAt(fall, 0.5).offset[1]).toBeLessThan(-1);
  });

  it("tumbles as it goes", () => {
    const turn = fallAt(fall, 0.3).turn;
    expect(Math.abs(turn[0])).toBeGreaterThan(1);
  });
});
