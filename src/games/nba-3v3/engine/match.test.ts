import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import type { MatchEvent } from "./events";
import { Match, type Entry } from "./match";
import { STEP } from "./tuning";

const BOTS: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: null }));

/** Plays a whole game between computer players and gathers every event. */
function playOut(seed: number, maxSeconds = 1500): { match: Match; events: MatchEvent[] } {
  const match = new Match({ entries: BOTS, seed });
  const events: MatchEvent[] = [];
  for (let t = 0; t < maxSeconds && match.phase !== "over"; t += STEP) {
    match.step(STEP);
    events.push(...match.drainEvents());
  }
  return { match, events };
}

describe("a game between computer players", () => {
  it("plays to eleven, scoring only twos and threes", () => {
    const { match, events } = playOut(7);
    expect(match.phase).toBe("over");
    expect(Math.max(...match.score)).toBeGreaterThanOrEqual(11);
    const scores = events.filter((e) => e.type === "score");
    for (const s of scores) if (s.type === "score") expect([2, 3]).toContain(s.points);
    const total = scores.reduce((sum, s) => sum + (s.type === "score" ? s.points : 0), 0);
    expect(total).toBe(match.score[0] + match.score[1]);
  }, 60000);

  it("shows the whole game over a few seeds: dunks, blocks, steals, passes, rebounds and every kind of shot", () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7]) {
      for (const e of playOut(seed).events) {
        seen.add(e.type);
        if (e.type === "shot") seen.add(`outcome:${e.outcome}`);
        if (e.type === "score") seen.add(`kind:${e.kind}`);
      }
    }
    for (const type of ["dunk", "block", "steal", "pass", "catch", "rebound", "rim", "board", "net", "win"]) expect(seen, type).toContain(type);
    for (const outcome of ["swish", "bank", "roll", "bounce", "rimOut", "inOut", "boardOut"]) expect(seen, outcome).toContain(`outcome:${outcome}`);
    expect(seen).toContain("kind:layup");
    expect(seen).toContain("kind:jumper");
  }, 60000);

  it("replays exactly from the same seed", () => {
    const a = playOut(11, 60);
    const b = playOut(11, 60);
    expect(a.match.score).toEqual(b.match.score);
    expect(a.events.length).toBe(b.events.length);
  });
});
