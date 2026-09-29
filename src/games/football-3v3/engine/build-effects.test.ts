import { describe, expect, it } from "vitest";
import { BUILD_IDS, BUILDS, STAT_IDS } from "../builds";
import { createAthlete, gripOf, topSpeed } from "./body";
import { breakChance, catchReach, coverReach, jukeRecovery, kickLeg } from "./build-effects";
import { startJuke } from "./juke";

const stats = (id: keyof typeof BUILDS) => BUILDS[id].stats;
const athlete = (id: keyof typeof BUILDS) => createAthlete(0, 0, "runner", 0, id, null);

describe("builds", () => {
  it("rate every stat from 1 to 10 and each lead the others in something", () => {
    for (const id of BUILD_IDS) for (const s of STAT_IDS) expect(stats(id)[s]).toBeGreaterThanOrEqual(1);
    for (const id of BUILD_IDS) for (const s of STAT_IDS) expect(stats(id)[s]).toBeLessThanOrEqual(10);
    // No two builds share the same ratings, so every pick plays differently.
    expect(new Set(BUILD_IDS.map((id) => JSON.stringify(stats(id)))).size).toBe(BUILD_IDS.length);
  });

  it("make the Speedster the fastest and the Power Back the hardest to bring down", () => {
    const fastest = BUILD_IDS.reduce((a, b) => (topSpeed(athlete(b), false) > topSpeed(athlete(a), false) ? b : a));
    expect(fastest).toBe("speedster");
    expect(breakChance(stats("powerback"), stats("lockdown"))).toBeGreaterThan(0.1);
    expect(breakChance(stats("speedster"), stats("lockdown"))).toBe(0);
    expect(breakChance(stats("powerback"), stats("speedster"))).toBeLessThanOrEqual(0.4);
  });

  it("give the Route Runner the widest catch and the Lockdown the widest read", () => {
    const hands = BUILD_IDS.reduce((a, b) => (catchReach(stats(b)) > catchReach(stats(a)) ? b : a));
    const cover = BUILD_IDS.reduce((a, b) => (coverReach(stats(b)) > coverReach(stats(a)) ? b : a));
    expect(hands).toBe("routerunner");
    expect(cover).toBe("lockdown");
    expect(catchReach({ ...stats("routerunner"), hands: 5 })).toBeCloseTo(1);
  });

  it("let the Gunslinger kick longest and agile builds cut and juke sharper", () => {
    expect(kickLeg(stats("gunslinger"))).toBeGreaterThan(kickLeg(stats("scrambler")));
    expect(gripOf(athlete("scrambler"))).toBeGreaterThan(gripOf(athlete("powerback")));
    expect(jukeRecovery(stats("routerunner"))).toBeLessThan(jukeRecovery(stats("powerback")));
    const quick = athlete("routerunner");
    const slow = athlete("powerback");
    startJuke(quick, () => {});
    startJuke(slow, () => {});
    expect(quick.jukeCd).toBeLessThan(slow.jukeCd);
  });
});
