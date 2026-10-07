import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { createAthlete } from "../athlete";
import { Match } from "../match";
import { COURT, STEP } from "../tuning";
import type { Athlete } from "../types";
import { BODY } from "./body-spec";
import { collide } from "./contact";
import { bodyMass, contactMass } from "./mass";
import { fallTime, hangTime, heightAt, speedToMeet, takeoffSpeed } from "./jump";
import { MAX_DUNK_PEAK } from "../finish/plan";

const G = BODY.gravity;

function at(build: (typeof BUILD_IDS)[number], x: number, z: number, vx = 0, vz = 0): Athlete {
  const a = createAthlete(0, 0, 0, build, null);
  Object.assign(a, { x, z, vx, vz });
  return a;
}

const momentum = (ps: Athlete[], ms: number[]) => ({
  x: ps.reduce((s, p, i) => s + p.vx * ms[i]!, 0),
  z: ps.reduce((s, p, i) => s + p.vz * ms[i]!, 0),
});
const energy = (ps: Athlete[], ms: number[]) => ps.reduce((s, p, i) => s + 0.5 * ms[i]! * (p.vx * p.vx + p.vz * p.vz), 0);

describe("body weights", () => {
  it("come out like real players, the big man heaviest and the playmaker lightest", () => {
    const kg = Object.fromEntries(BUILD_IDS.map((id) => [id, bodyMass({ build: id })]));
    for (const m of Object.values(kg)) {
      expect(m).toBeGreaterThan(70);
      expect(m).toBeLessThan(130);
    }
    expect(kg.big!).toBeGreaterThan(kg.dunker!);
    expect(kg.playmaker!).toBeLessThan(kg.shooter!);
  });

  it("brace a set player with the legs, but not one on the run or in the air", () => {
    const set = at("big", 0, 5);
    const running = at("big", 0, 5, 4, 0);
    const flying = at("big", 0, 5);
    flying.y = 0.4;
    expect(contactMass(set)).toBeGreaterThan(bodyMass(set) * 1.3);
    expect(contactMass(running)).toBeCloseTo(bodyMass(running), 6);
    expect(contactMass(flying)).toBeCloseTo(bodyMass(flying), 6);
  });
});

describe("bodies running into each other", () => {
  it("keeps momentum and never makes energy", () => {
    for (let i = 0; i < 200; i++) {
      const a = at(BUILD_IDS[i % 6]!, 0, 5, Math.sin(i) * 5, Math.cos(i * 1.3) * 5);
      const b = at(BUILD_IDS[(i + 2) % 6]!, 0.5 + (i % 5) * 0.05, 5.2, Math.cos(i * 0.7) * 4, Math.sin(i * 2.1) * 4);
      const ms = [contactMass(a), contactMass(b)];
      const p0 = momentum([a, b], ms);
      const e0 = energy([a, b], ms);
      collide(a, b, 0.4, 0.4);
      const p1 = momentum([a, b], ms);
      expect(p1.x).toBeCloseTo(p0.x, 6);
      expect(p1.z).toBeCloseTo(p0.z, 6);
      expect(energy([a, b], ms)).toBeLessThanOrEqual(e0 + 1e-9);
    }
  });

  it("stops a guard who sprints into a set big man's screen, and the big man barely gives", () => {
    const guard = at("playmaker", 0, 5, 5.5, 0);
    const big = at("big", 0.7, 5);
    const hit = collide(guard, big, 0.4, 0.45);
    expect(hit?.closing).toBeCloseTo(5.5, 6);
    // From 5.5 to a jog, while the big man is rocked back at under 2 metres a second.
    expect(Math.abs(guard.vx)).toBeLessThan(1.5);
    expect(big.vx).toBeLessThan(2);
    expect(big.vx).toBeGreaterThan(0);
  });

  it("pushes apart two who overlap, the lighter one giving more ground", () => {
    const light = at("playmaker", 0, 5);
    const heavy = at("big", 0.5, 5);
    collide(light, heavy, 0.4, 0.45);
    expect(heavy.x - light.x).toBeCloseTo(0.85, 6);
    expect(-light.x).toBeGreaterThan(heavy.x - 0.5);
  });

  it("rubs off sideways speed when two brush past each other", () => {
    const a = at("shooter", 0, 5, 1, 4);
    const b = at("lockdown", 0.7, 5, -1, 0);
    collide(a, b, 0.4, 0.4);
    expect(a.vz).toBeLessThan(4);
  });
});

describe("bodies over a whole game", () => {
  it("stay finite, on the court, under a sprinter's speed and never higher than a dunker can jump", () => {
    const m = new Match({ entries: BUILD_IDS.map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null })), seed: 21 });
    let fastest = 0;
    let highest = 0;
    for (let t = 0; t < 240 && m.phase !== "over"; t += STEP) {
      m.step(STEP);
      for (const a of m.athletes) {
        for (const v of [a.x, a.z, a.y, a.vx, a.vz]) expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(a.x)).toBeLessThan(COURT.halfWidth + 0.01);
        expect(a.y).toBeGreaterThanOrEqual(0);
        fastest = Math.max(fastest, Math.hypot(a.vx, a.vz));
        highest = Math.max(highest, a.y);
      }
    }
    expect(fastest).toBeLessThan(8);
    // A small guard with space gets up as high as the dunk plan lets anyone go, and a slower,
    // showier dunk rises a touch past it to slam on the way down (see `speedToMeet`).
    expect(highest).toBeLessThanOrEqual(MAX_DUNK_PEAK + 0.1);
  }, 60000);
});

describe("jumping under real gravity", () => {
  it("stays up exactly as long as the height says", () => {
    expect(hangTime(0.5)).toBeCloseTo(2 * Math.sqrt(1 / G), 9);
    const v0 = takeoffSpeed(0.6);
    expect(heightAt(v0, v0 / G)).toBeCloseTo(0.6, 9);
    expect(heightAt(v0, hangTime(0.6))).toBeCloseTo(0, 9);
    expect(fallTime(1.2, 0)).toBeCloseTo(Math.sqrt(2.4 / G), 9);
  });

  it("meets the rim on time: a slower dunk goes a touch higher and slams on the way down", () => {
    const quick = speedToMeet(0.8, Math.sqrt(1.6 / G));
    expect(quick).toBeCloseTo(takeoffSpeed(0.8), 6);
    const slow = speedToMeet(0.8, 0.54);
    expect(heightAt(slow, 0.54)).toBeCloseTo(0.8, 9);
    const apex = (slow * slow) / (2 * G);
    expect(apex).toBeGreaterThan(0.8);
    expect(apex).toBeLessThan(0.9);
    // Past the top of the jump by the slam.
    expect(slow / G).toBeLessThan(0.54);
  });
});
