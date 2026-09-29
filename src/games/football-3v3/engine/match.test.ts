import { describe, expect, it } from "vitest";
import type { MatchEvent } from "./events";
import { createMatch, endReplay, stepMatch } from "./match";
import type { MatchOptions, MatchState } from "./types";

/** Plays a game of computer players to the end, or gives up after an hour of game time. */
function playOut(seed: number, level: "easy" | "hard" = "hard", extra: Partial<MatchOptions> = {}): { state: MatchState; events: MatchEvent[] } {
  const state = createMatch([], { seed, level, replays: true, ...extra });
  const events: MatchEvent[] = [];
  for (let t = 0; t < 3600 && state.phase !== "final"; t += 1 / 60) {
    stepMatch(state);
    events.push(...state.events);
    // The host ends replays; here they end at once.
    if (state.phase === "replay") endReplay(state);
    for (const a of state.athletes) if (!Number.isFinite(a.pos.x + a.pos.z)) throw new Error("A player left the world.");
    if (!Number.isFinite(state.ball.pos.x + state.ball.pos.y + state.ball.pos.z)) throw new Error("The ball left the world.");
  }
  return { state, events };
}

describe("a game of computer players", () => {
  const games = [1, 2, 3, 4].map((seed) => playOut(seed, seed % 2 ? "hard" : "easy"));
  const all = games.flatMap((g) => g.events);
  const count = (type: MatchEvent["type"]) => all.filter((e) => e.type === type).length;

  it("reaches the end with a winner at 14 or more", () => {
    for (const { state } of games) {
      expect(state.phase).toBe("final");
      expect(state.winner).not.toBeNull();
      expect(state.score[state.winner!]).toBeGreaterThanOrEqual(14);
    }
  });

  it("has throws, catches, tackles, first downs and touchdowns", () => {
    expect(count("hike")).toBeGreaterThan(20);
    expect(count("throw")).toBeGreaterThan(15);
    expect(count("catch")).toBeGreaterThan(10);
    expect(count("tackle")).toBeGreaterThan(10);
    expect(count("firstDown")).toBeGreaterThan(5);
    expect(all.filter((e) => e.type === "score" && e.kind === "touchdown").length).toBeGreaterThan(3);
    expect(count("juke")).toBeGreaterThan(3);
    expect(count("pads")).toBeGreaterThan(20);
  });

  it("scores kicks after touchdowns", () => {
    expect(all.some((e) => e.type === "kickResult" && e.kind === "pat")).toBe(true);
  });

  it("keeps the stat sheet in step with the score", () => {
    for (const { state, events } of games) {
      const tds = events.filter((e) => e.type === "score" && e.kind === "touchdown").length;
      expect(state.athletes.reduce((n, a) => n + a.stats.touchdowns, 0)).toBe(tds);
      const passing = state.athletes.reduce((n, a) => n + a.stats.passYards, 0);
      const receiving = state.athletes.reduce((n, a) => n + a.stats.recYards, 0);
      expect(passing).toBe(receiving);
    }
  });

  it("plays the same game from the same seed", () => {
    const again = playOut(1, "hard");
    expect(again.state.score).toEqual(games[0]!.state.score);
    expect(again.state.time).toBeCloseTo(games[0]!.state.time, 6);
  });

  it("ends on the clock when nobody gets to 14, with overtime for a tie", () => {
    // Short quarters and an unreachable target, so only the clock can end it.
    const { state, events } = playOut(5, "easy", { quarterSeconds: 8, pointsToWin: 99 });
    expect(state.phase).toBe("final");
    expect(events.some((e) => e.type === "quarter" && e.quarter === 4)).toBe(true);
    // A tie after four goes to sudden death, so there is always a winner, and ahead.
    expect(state.winner).not.toBeNull();
    expect(state.score[state.winner!]).toBeGreaterThan(state.score[state.winner === 0 ? 1 : 0]);
  });
});
