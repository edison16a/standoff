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
        for (const k of ["pass", "catch", "intercept", "steal", "foul", "rebound", "fumble", "knockdown"] as const) if (e.type === k) add(k);
      }
    }
    add("seconds", m.time);
    add("games");
  }
  return t;
}

describe.skipIf(!process.env.NBA_STATS)("the pace of a computer game", () => {
  it("prints the numbers", () => {
    const t = tally([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const per = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, k === "games" ? v : Math.round((v / t.games!) * 100) / 100]));
    console.log("PACE", JSON.stringify(per));
    expect(t.games).toBe(10);
  }, 600000);
});
