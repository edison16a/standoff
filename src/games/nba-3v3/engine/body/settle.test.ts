import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { Match, type Entry } from "../match";
import { STEP } from "../tuning";

const ENTRIES: Entry[] = BUILD_IDS.map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));

/**
 * Seen in bot games: a man posterized at the top of his block jump went
 * into his stumble 0.36 m up and stood on air from then on, until his
 * next jump. A body knocked out of a jump falls back to the floor.
 */
describe("a body knocked out of a jump", () => {
  it("falls to the floor under gravity in the stumble, and stays there", () => {
    const m = new Match({ entries: ENTRIES, seed: 2, firstOffence: 0 });
    while (m.phase !== "live") m.step(STEP);
    const a = m.athletes[4]!;
    Object.assign(a, { y: 0.4, auto: false, move: { x: 0, z: 0 }, action: { kind: "stumble", t: 0, dur: 1, fall: "back" } });
    const heights: number[] = [];
    for (let i = 0; i < 40; i++) {
      m.step(STEP);
      heights.push(a.y);
    }
    // About 0.29 s to fall 0.4 m, and never a pop: each step is a little further than the last.
    expect(heights[12]!).toBeGreaterThan(0);
    expect(heights[20]!).toBe(0);
    for (let i = 1; i < 18; i++) expect(heights[i - 1]! - heights[i]!).toBeLessThan(0.1);
    expect(heights.at(-1)).toBe(0);
  });
});
