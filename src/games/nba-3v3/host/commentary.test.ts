import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../engine/events";
import { Match, type Entry } from "../engine/match";
import { STEP } from "../engine/tuning";
import { CHARACTER_IDS } from "../roster";
import { Commentary } from "./commentary";

const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: null }));
const NAMES = ["Ana", "Ben", "Cal", "Dee", "Eli", "Fay"];

type Score = Extract<MatchEvent, { type: "score" }>;

/** Puts a basket on the board as the engine would, and returns its event. */
function basket(m: Match, id: number, extra: Partial<Score> = {}): Score {
  const team = m.athletes[id]!.team;
  const e: Score = { type: "score", team, points: 2, id, kind: "jumper", outcome: "swish", assist: null, streak: 1, dunk: null, ...extra };
  m.score[team] += e.points;
  return e;
}

describe("the announcer's calls", () => {
  it("calls every basket by name, with dunks and threes their own words, and varies them", () => {
    const m = new Match({ entries: ENTRIES, seed: 1 });
    const c = new Commentary((id) => NAMES[id]!);
    const dunks = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const line = c.onEvent(basket(m, 0, { kind: "dunk" }), m)!;
      expect(line.priority).toBe(2);
      dunks.add(line.text);
      m.score[0] -= 2;
    }
    expect(dunks.size).toBe(3);
    const three = c.onEvent(basket(m, 1, { points: 3 }), m)!;
    expect(three.text).toContain("Ben");
    const layup = c.onEvent(basket(m, 3, { kind: "layup", outcome: "bank" }), m)!;
    expect(layup.text).toContain("Dee");
  });

  it("notices a hot hand, a run, a tie and game point", () => {
    const m = new Match({ entries: ENTRIES, seed: 1 });
    const c = new Commentary((id) => NAMES[id]!);
    expect(c.onEvent(basket(m, 0, { streak: 3 }), m)!.text).toContain("heating up");
    c.onEvent(basket(m, 2), m);
    const run = c.onEvent(basket(m, 0, { streak: 4 }), m)!.text;
    expect(run).toContain("on fire");
    expect(c.onEvent(basket(m, 1), m)!.text).not.toContain("Tie");
    c.onEvent(basket(m, 1), m);
    expect(c.onEvent(basket(m, 3), m)!.text).toContain("Tie game, 6 all");
    m.score[0] = 7;
    expect(c.onEvent(basket(m, 0), m)!.text).toContain("Game point");
  });

  it("leaves the winning basket to the winner's call", () => {
    const m = new Match({ entries: ENTRIES, seed: 1 });
    const c = new Commentary((id) => NAMES[id]!);
    m.score[1] = 9;
    expect(c.onEvent(basket(m, 1), m)!.text).toBe("");
    const win = c.onEvent({ type: "win", team: 1 }, m)!;
    expect(win.priority).toBe(3);
    expect(win.text.length).toBeGreaterThan(0);
  });

  it("has a call for every basket of a whole computer game", () => {
    const m = new Match({ entries: ENTRIES, seed: 9 });
    const c = new Commentary((id) => NAMES[id]!);
    let calls = 0;
    let baskets = 0;
    for (let t = 0; t < 900 && m.phase !== "over"; t += STEP) {
      m.step(STEP);
      for (const e of m.drainEvents()) {
        if (e.type !== "score") continue;
        baskets++;
        const text = c.onEvent(e, m)?.text ?? "";
        if (text || m.score[e.team] >= m.target) calls++;
      }
    }
    expect(baskets).toBeGreaterThan(3);
    expect(calls).toBe(baskets);
  }, 30000);

  it("calls a foul, a made free throw without heating anyone up, and a broken ankle", () => {
    const m = new Match({ entries: ENTRIES, seed: 1 });
    const c = new Commentary((id) => NAMES[id]!);
    expect(c.onEvent({ type: "foul", id: 1, victim: 0, attempt: 3 }, m)?.text).toMatch(/Ben|Ana/);
    const free = c.onEvent(basket(m, 0, { kind: "free", points: 1, streak: 3 }), m)!;
    expect(free.text).not.toContain("heating");
    expect(c.onEvent({ type: "shake", id: 2, victim: 1, hard: true }, m)?.text).toBeTruthy();
    expect(c.onEvent({ type: "shake", id: 2, victim: 1, hard: false }, m)).toBeNull();
  });
});
