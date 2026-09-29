import { describe, expect, it } from "vitest";
import { BUILD_IDS, BUILDS, cpuName, isBuildId } from "../builds";
import { STAT_IDS } from "../roster";
import { contestScale, guardScale, interceptChance, passLead, passSpeedScale, readEdge, stealEdge } from "./build-effects";

const stats = (id: keyof typeof BUILDS) => BUILDS[id].stats;

describe("builds", () => {
  it("rates every build 1 to 10 in every stat, with no build far ahead of the others", () => {
    const totals = BUILD_IDS.map((id) => STAT_IDS.reduce((sum, s) => sum + BUILDS[id].stats[s], 0));
    for (const id of BUILD_IDS) for (const s of STAT_IDS) expect(BUILDS[id].stats[s]).toBeGreaterThanOrEqual(1);
    for (const id of BUILD_IDS) for (const s of STAT_IDS) expect(BUILDS[id].stats[s]).toBeLessThanOrEqual(10);
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(2);
  });

  it("makes each build best at what it is named for", () => {
    const best = (s: (typeof STAT_IDS)[number]) => Math.max(...BUILD_IDS.map((id) => BUILDS[id].stats[s]));
    expect(stats("shooter").shooting).toBe(best("shooting"));
    expect(stats("playmaker").passing).toBe(best("passing"));
    expect(stats("lockdown").defence).toBe(best("defence"));
    expect(stats("dunker").strength).toBe(best("strength"));
    expect(BUILDS.big.body.reach).toBe(Math.max(...BUILD_IDS.map((id) => BUILDS[id].body.reach)));
  });

  it("names computer players by their build", () => {
    expect(cpuName("big")).toBe("CPU Big Man");
    expect(isBuildId("shooter")).toBe(true);
    expect(isBuildId("center")).toBe(false);
  });
});

describe("build effects", () => {
  it("plays an average rating like the game before builds", () => {
    expect(contestScale(5)).toBeCloseTo(1);
    expect(guardScale(5)).toBeCloseTo(1);
    expect(readEdge(5)).toBe(0);
    expect(passLead(7)).toBeCloseTo(0.9, 1);
  });

  it("gives the Playmaker faster passes that are harder to pick off", () => {
    const pm = stats("playmaker");
    const big = stats("big");
    expect(passSpeedScale(pm.passing)).toBeGreaterThan(passSpeedScale(stats("dunker").passing));
    expect(interceptChance(big, pm)).toBeLessThan(interceptChance(big, stats("dunker")));
  });

  it("gives Lockdown the better steals, contests, reads and Guard", () => {
    const ld = stats("lockdown");
    const sh = stats("shooter");
    const holder = stats("allround");
    expect(stealEdge(ld, holder)).toBeGreaterThan(stealEdge(sh, holder));
    expect(contestScale(ld.defence)).toBeGreaterThan(contestScale(sh.defence));
    expect(readEdge(ld.defence)).toBeGreaterThan(readEdge(sh.defence));
    expect(guardScale(ld.defence)).toBeGreaterThan(guardScale(sh.defence));
    expect(interceptChance(ld, holder)).toBeGreaterThan(interceptChance(sh, holder));
  });
});
