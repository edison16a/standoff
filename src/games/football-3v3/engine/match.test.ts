import { describe, expect, it } from "vitest";
import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import type { MatchEvent } from "./events";
import { Match } from "./match";
import { BOTS, run } from "./test-helpers";

function playOut(seed: number, level: BotLevel = "medium"): { m: Match; events: MatchEvent[] } {
  const m = new Match({ entries: BOTS, seed, level, quarterSeconds: 45 });
  const events: MatchEvent[] = [];
  for (let i = 0; i < 400 && m.phase !== "over"; i++) {
    events.push(...run(m, 5));
    for (const a of m.athletes) if (!Number.isFinite(a.x + a.z)) throw new Error("A player left the world.");
    if (!Number.isFinite(m.ball.pos.x + m.ball.pos.y + m.ball.pos.z)) throw new Error("The ball left the world.");
  }
  return { m, events };
}

describe("a whole game of computer players", () => {
  const { m, events } = playOut(1);

  it("ends with the clock or the target", () => {
    expect(m.phase).toBe("over");
    expect(m.score[0] >= m.target || m.score[1] >= m.target || m.quarter >= 4).toBe(true);
    expect(events.at(-1)?.type).toBe("win");
  });

  it("adds up the score from the scoring events", () => {
    const total: [number, number] = [0, 0];
    for (const e of events) if (e.type === "score") total[e.team] += e.points;
    expect(total).toEqual(m.score);
  });

  it("throws, pitches, catches and tackles along the way", () => {
    // A few games, so one lopsided game cannot hide a missing piece.
    const all = [events, ...[2, 3].map((seed) => playOut(seed).events)].flat();
    const count = (type: MatchEvent["type"]) => all.filter((e) => e.type === type).length;
    expect(count("hike")).toBeGreaterThan(9);
    expect(count("throw")).toBeGreaterThan(6);
    expect(count("pitch")).toBeGreaterThan(0);
    expect(count("takePitch")).toBeGreaterThan(0);
    expect(count("catch")).toBeGreaterThan(3);
    expect(count("tackle") + count("incomplete")).toBeGreaterThan(3);
  }, 60_000);

  it("keeps the stats in step with the plays", () => {
    const catches = events.filter((e) => e.type === "catch").length;
    const credited = m.athletes.reduce((n, a) => n + a.stats.catches, 0);
    expect(credited).toBe(catches);
  });
});

describe("determinism", () => {
  it("plays the same game from the same seed", () => {
    const a = new Match({ entries: BOTS, seed: 5, level: "medium" });
    const b = new Match({ entries: BOTS, seed: 5, level: "medium" });
    const ea = run(a, 60);
    const eb = run(b, 60);
    expect(eb).toEqual(ea);
    expect(b.athletes.map((x) => [x.x, x.z])).toEqual(a.athletes.map((x) => [x.x, x.z]));
  });
});

describe("training", () => {
  it("leaves the computer players standing still", () => {
    const m = new Match({ entries: BOTS, seed: 3, level: "training", firstOffense: 0 });
    run(m, 30, () => m.phase === "live");
    run(m, 0.6);
    const before = m.athletes.filter((a) => a.role === "runner").map((a) => [a.x, a.z]);
    run(m, 3);
    const after = m.athletes.filter((a) => a.role === "runner").map((a) => [a.x, a.z]);
    expect(after).toEqual(before);
  });
});
