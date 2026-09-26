import { describe, expect, it } from "vitest";
import type { BattleEvent } from "./events";
import { newMatch, roundOutcome, sideOf, tickMatch, type MatchState } from "./match";
import { fighterAt } from "./test-helpers";
import { RULES } from "./tuning";

const team = () => [fighterAt(0, 0, 0, -20), fighterAt(1, 1, 0, 20), fighterAt(2, 0, 3, -20), fighterAt(3, 1, 3, 20)];

/** Runs the clock for `seconds`, collecting events and resets. */
function run(m: MatchState, fighters: ReturnType<typeof team>, seconds: number) {
  const events: BattleEvent[] = [];
  let resets = 0;
  for (let t = 0; t < seconds; t += 1 / 60) {
    const tick = tickMatch(m, fighters, 1 / 60);
    events.push(...tick.events);
    if (tick.resetRound) resets += 1;
  }
  return { events, resets };
}

describe("round and match flow", () => {
  it("counts down, then fights", () => {
    const m = newMatch();
    const fighters = team();
    const { events } = run(m, fighters, RULES.countdown + 0.1);
    expect(events.filter((e) => e.type === "countdown").map((e) => e.type === "countdown" && e.seconds)).toEqual([2, 1]);
    expect(events.at(-1)).toEqual({ type: "fight", round: 1 });
    expect(m.phase).toBe("fight");
  });

  it("gives the round to the side still standing, holds, then resets with a new round", () => {
    const m = newMatch();
    const fighters = team();
    run(m, fighters, RULES.countdown + 1);
    fighters[1]!.alive = false;
    // One of two down is not the round.
    expect(run(m, fighters, 0.1).events).toEqual([]);
    fighters[3]!.alive = false;
    const end = run(m, fighters, 0.1);
    expect(end.events).toContainEqual({ type: "round-end", round: 1, winner: 0, score: [1, 0] });
    expect(m.phase).toBe("round-over");
    const hold = run(m, fighters, RULES.roundHold + 0.1);
    expect(hold.resets).toBe(1);
    expect(m.round).toBe(2);
    expect(m.phase).toBe("countdown");
  });

  it("calls a draw when both sides go down together, with no point", () => {
    const m = newMatch();
    const fighters = team();
    run(m, fighters, RULES.countdown + 1);
    for (const f of fighters) f.alive = false;
    const { events } = run(m, fighters, 0.1);
    expect(events).toContainEqual({ type: "round-end", round: 1, winner: null, score: [0, 0] });
  });

  it("calls a stalled round for the side with more health", () => {
    const fighters = team();
    fighters[0]!.health = 20;
    expect(roundOutcome(fighters, false)).toBeUndefined();
    expect(roundOutcome(fighters, true)).toBe(1);
    fighters[1]!.health = 20;
    expect(roundOutcome(fighters, true)).toBeNull();
  });

  it("keeps going when the trailing side takes a round", () => {
    const m = newMatch();
    m.score = [RULES.roundsToWin - 1, 2];
    const fighters = team();
    run(m, fighters, RULES.countdown + 1);
    fighters[0]!.alive = false;
    fighters[2]!.alive = false;
    const { events } = run(m, fighters, 0.1);
    expect(events).toContainEqual({ type: "round-end", round: 1, winner: 1, score: [4, 3] });
    expect(events.some((e) => e.type === "match-end")).toBe(false);
    expect(m.phase).toBe("round-over");
  });

  it("names the champion once a side reaches five", () => {
    const m = newMatch();
    m.score = [RULES.roundsToWin - 1, 0];
    const fighters = team();
    run(m, fighters, RULES.countdown + 1);
    fighters[1]!.alive = false;
    fighters[3]!.alive = false;
    const { events } = run(m, fighters, 0.1);
    expect(events).toContainEqual({ type: "match-end", winner: 0, score: [5, 0] });
    expect(m.winner).toBe(0);
    run(m, fighters, RULES.matchHold + 0.1);
    expect(m.phase).toBe("done");
  });

  it("swaps ends every round", () => {
    expect([1, 2, 3, 4].map((r) => sideOf(0, r))).toEqual([0, 1, 0, 1]);
    expect([1, 2, 3, 4].map((r) => sideOf(1, r))).toEqual([1, 0, 1, 0]);
  });
});
