import { describe, expect, it } from "vitest";
import { Rng } from "../engine/rng";
import { WEAPON_IDS } from "../engine/weapons";
import { magazineReload, shotCycle } from "./actions";
import { bounces, CASINGS, CasingBody, casingSeed } from "./casings";
import { distanceAt, flight, isTracer, ROUNDS } from "./rounds";

describe("rounds in flight", () => {
  it("cross twenty metres in real time: the rifle fastest, buckshot slowest", () => {
    const t = (id: keyof typeof ROUNDS) => flight(ROUNDS[id], 20).time;
    expect(t("rifle")).toBeGreaterThan(0.02);
    expect(t("rifle")).toBeLessThan(0.025);
    expect(t("shotgun")).toBeGreaterThan(t("ak47"));
    expect(t("ak47")).toBeGreaterThan(t("rifle"));
  });

  it("drop a little under gravity, more for slow rounds", () => {
    expect(flight(ROUNDS.rifle, 30).drop).toBeGreaterThan(0.004);
    expect(flight(ROUNDS.rifle, 30).drop).toBeLessThan(0.01);
    expect(flight(ROUNDS.shotgun, 30).drop).toBeGreaterThan(flight(ROUNDS.rifle, 30).drop);
  });

  it("finds the distance flown as the inverse of the flight time", () => {
    for (const id of WEAPON_IDS) {
      const { time } = flight(ROUNDS[id], 25);
      expect(distanceAt(ROUNDS[id], time)).toBeCloseTo(25, 6);
    }
  });

  it("loads every third rifle round as a tracer and none in the shotgun", () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => isTracer(ROUNDS.rifle, i))).toEqual([false, false, true, false, false, true]);
    expect(isTracer(ROUNDS.shotgun, 2)).toBe(false);
  });
});

describe("spent cases", () => {
  it("fly out to the right, land and come to rest", () => {
    for (const id of WEAPON_IDS) {
      const rng = new Rng(7);
      const body = new CasingBody(CASINGS[id], 1.2, () => rng.next());
      while (!body.resting && body.age < 5) body.step(() => rng.next());
      expect(body.resting, id).toBe(true);
      expect(body.pos.x, id).toBeGreaterThan(0.3);
      expect(body.pos.y).toBe(0);
    }
  });

  it("bounce a few times, each softer than the last", () => {
    const rng = new Rng(3);
    const list = bounces(CASINGS.rifle, 1.2, () => rng.next());
    expect(list.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < list.length; i++) expect(list[i]!.speed).toBeLessThan(list[i - 1]!.speed);
    expect(list[0]!.time).toBeGreaterThan(0.3);
  });

  it("replay exactly from the same seed, so the sound matches the picture", () => {
    const seed = casingSeed(2, 41);
    const a = new Rng(seed);
    const b = new Rng(seed);
    expect(bounces(CASINGS.ak47, 1.2, () => a.next())).toEqual(bounces(CASINGS.ak47, 1.2, () => b.next()));
    expect(casingSeed(2, 41)).not.toBe(casingSeed(2, 42));
  });

  it("thud for the plastic hull and ring for brass: the hull keeps less of its bounce", () => {
    expect(CASINGS.shotgun.restitution).toBeLessThan(CASINGS.rifle.restitution);
  });
});

describe("actions", () => {
  it("keep every reload step in order and inside the reload", () => {
    for (const id of ["rifle", "ak47", "smg"] as const) {
      for (const empty of [false, true]) {
        const steps = magazineReload(id, 2, empty);
        for (let i = 1; i < steps.length; i++) expect(steps[i]!.at).toBeGreaterThan(steps[i - 1]!.at);
        expect(steps.at(-1)!.at).toBeLessThan(2);
        expect(steps.map((s) => s.step)).toContain("mag-seat");
      }
    }
  });

  it("chamber a round only after a dry gun's reload", () => {
    expect(magazineReload("ak47", 2.6, false).map((s) => s.step)).not.toContain("bolt-back");
    expect(magazineReload("ak47", 2.6, true).map((s) => s.step)).toContain("bolt-forward");
    expect(magazineReload("rifle", 2, true).map((s) => s.step)).toContain("bolt-catch");
  });

  it("racks the pump after a shot and cycles a bolt at once", () => {
    expect(shotCycle("shotgun")[0]).toEqual({ step: "pump-back", at: 0.2 });
    expect(shotCycle("rifle")[0]!.at).toBe(0);
  });
});
