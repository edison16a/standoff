import { describe, expect, it } from "vitest";
import { BUILD_IDS, BUILDS } from "../../builds";
import { createAthlete } from "../athlete";
import { seeded } from "../rng";
import { dunkOdds, dunkRating, rollDunk, type DunkRead, type Stopper } from "./dunk-odds";
import { dunkHeadroom } from "./plan";

/** A clean dunk: in range, at speed, square to the rim, balanced, by a strong leaper, nobody home. */
const GOOD: DunkRead = { distance: 2.6, speed: 5, heading: 1, offBalance: 0, rating: 9, canDunk: true, stopper: null };
const BIG: Stopper = { dist: 0.6, spot: "rim", up: false, edge: -3, reach: 0.3, defence: 9 };

describe("the dunk odds", () => {
  it("lands a good dunk nearly every time", () => {
    expect(dunkOdds(GOOD).make).toBeGreaterThan(0.95);
    // A small man the dunker overpowers is posterized, not a stopper.
    expect(dunkOdds({ ...GOOD, stopper: { ...BIG, edge: 4, reach: -0.1, defence: 5 } }).make).toBeGreaterThan(0.9);
  });

  it("comes up short from too far out, or for a body that cannot get up there", () => {
    expect(dunkOdds({ ...GOOD, distance: 4.8 }).short).toBeGreaterThan(0.95);
    expect(dunkOdds({ ...GOOD, distance: 3.9 }).short).toBeGreaterThan(0.3);
    expect(dunkOdds({ ...GOOD, canDunk: false }).short).toBeGreaterThan(0.85);
  });

  it("gets stuffed by a bigger man waiting at the rim", () => {
    const o = dunkOdds({ ...GOOD, stopper: BIG });
    expect(o.stuff).toBeGreaterThan(0.6);
    // Not by one already in the air, or one well away from the rim.
    expect(dunkOdds({ ...GOOD, stopper: { ...BIG, up: true } }).stuff).toBe(0);
    expect(dunkOdds({ ...GOOD, stopper: { ...BIG, dist: 2.5 } }).stuff).toBe(0);
  });

  it("clangs off the iron from a standstill out from the rim, off balance, on a slant, or for a weak dunker", () => {
    const base = dunkOdds(GOOD).clang;
    expect(dunkOdds({ ...GOOD, speed: 0.2 }).clang).toBeGreaterThan(base + 0.15);
    expect(dunkOdds({ ...GOOD, offBalance: 1 }).clang).toBeGreaterThan(base + 0.2);
    expect(dunkOdds({ ...GOOD, heading: -0.5 }).clang).toBeGreaterThan(base + 0.2);
    expect(dunkOdds({ ...GOOD, rating: 5 }).clang).toBeGreaterThan(base + 0.03);
    // Right under the rim the standstill matters little: a putback goes straight back up.
    expect(dunkOdds({ ...GOOD, speed: 0, distance: 0.9 }).clang).toBeLessThan(base + 0.03);
  });

  it("jams a dunk called late at a sprint, right under the ring, into the back iron", () => {
    const base = dunkOdds(GOOD).clang;
    expect(dunkOdds({ ...GOOD, distance: 0.5, speed: 5.5 }).clang).toBeGreaterThan(base + 0.3);
    // Jogging in under it, or standing there, he just goes up with it.
    expect(dunkOdds({ ...GOOD, distance: 0.5, speed: 2 }).clang).toBeLessThan(base + 0.01);
  });

  it("adds up to one, and rolls each way about as often as it says", () => {
    const o = dunkOdds({ ...GOOD, distance: 3.8, speed: 1, stopper: { ...BIG, edge: 0 } });
    expect(o.make + o.stuff + o.clang + o.short).toBeCloseTo(1, 6);
    const rng = seeded(4);
    const seen: Record<string, number> = { make: 0, stuff: 0, clang: 0, short: 0 };
    for (let i = 0; i < 4000; i++) seen[rollDunk(rng, o) ?? "make"]!++;
    for (const k of ["make", "stuff", "clang", "short"] as const) expect(seen[k]! / 4000).toBeCloseTo(o[k], 1);
  });

  it("rates the Dunker and the Big Man above the guards", () => {
    const rating = (id: (typeof BUILD_IDS)[number]) => {
      const a = createAthlete(0, 0, 0, id, null);
      return dunkRating(BUILDS[id].stats.speed, BUILDS[id].stats.strength, dunkHeadroom(a));
    };
    expect(rating("dunker")).toBeGreaterThan(rating("shooter") + 2);
    expect(rating("big")).toBeGreaterThan(rating("playmaker") + 1);
  });
});
