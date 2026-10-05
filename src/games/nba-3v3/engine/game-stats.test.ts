import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import { Match, type Entry } from "./match";
import { STEP } from "./tuning";

const BOTS: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));

type Tally = Record<string, number>;

/** Plays computer games and counts what happened, for the pace of the game. */
function tally(seeds: readonly number[]): Tally {
  const t: Tally = {};
  const add = (k: string, n = 1) => (t[k] = (t[k] ?? 0) + n);
  for (const seed of seeds) {
    const m = new Match({ entries: BOTS, seed });
    for (let s = 0; s < 1500 && m.phase !== "over"; s += STEP) {
      m.step(STEP);
      for (const e of m.drainEvents()) {
        if (e.type === "shot") add(`att_${e.kind === "jumper" ? (e.three ? "three" : "two") : e.kind}`);
        if (e.type === "dunk") add("att_dunk");
        if (e.type === "score") add(`made_${e.kind === "jumper" ? (e.points === 3 ? "three" : "two") : e.kind}`);
        if (e.type === "score") add("points", e.points);
        if (e.type === "block") add(`block_${m.ball.shot?.kind ?? "?"}`);
        if (e.type === "violation") add(`violation_${e.reason}`);
        if (e.type === "fumble" && e.by === null) add("lostDribble");
        for (const k of ["pass", "catch", "intercept", "steal", "foul", "rebound", "fumble", "knockdown"] as const) if (e.type === k) add(k);
      }
    }
    add("seconds", m.time);
    add("games");
  }
  return t;
}

describe("the pace of a computer game on the ball physics", () => {
  it("keeps scoring, shooting, blocks and lost balls near what the game had before", () => {
    const t = tally([31, 32, 33, 34, 35, 36]);
    const per = (k: string) => (t[k] ?? 0) / t.games!;
    expect(per("points")).toBeGreaterThan(14);
    expect(per("points")).toBeLessThan(24);
    expect(per("seconds")).toBeGreaterThan(90);
    expect(per("seconds")).toBeLessThan(240);
    const threes = (t.made_three ?? 0) / Math.max(1, t.att_three ?? 0);
    expect(threes).toBeGreaterThan(0.2);
    expect(threes).toBeLessThan(0.6);
    const blocks = Object.keys(t).filter((k) => k.startsWith("block_")).reduce((sum, k) => sum + t[k]!, 0) / t.games!;
    expect(blocks).toBeGreaterThan(0.2);
    expect(blocks).toBeLessThan(3.5);
    expect(per("violation_out")).toBeLessThan(1);
    expect(per("lostDribble")).toBeLessThan(1);
    expect(per("intercept")).toBeLessThan(1.5);
  }, 120000);
});

describe.skipIf(!process.env.NBA_STATS)("the pace of a computer game, printed", () => {
  it("prints the numbers", () => {
    const t = tally([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const per = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, k === "games" ? v : Math.round((v / t.games!) * 100) / 100]));
    console.log("PACE", JSON.stringify(per));
    expect(t.games).toBe(10);
  }, 600000);
});
