import { describe, expect, it } from "vitest";
import { callFoul } from "../engine/free-throw";
import { Match, type Entry } from "../engine/match";
import { STEP } from "../engine/tuning";
import { CHARACTER_IDS } from "../roster";
import { courtState, freeThrowText } from "./publish";

const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: i < 2 ? i + 1 : null }));
const PLAYERS = [
  { seat: 1, name: "Ana", connected: true },
  { seat: 2, name: "Ben", connected: true },
];

/** A live match with phone player 0 on the ball and phone player 1 guarding them from `gap` away. */
function live(gap: number): Match {
  const m = new Match({ entries: ENTRIES, seed: 1, firstOffence: 0 });
  m.phase = "live";
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.8, auto: i > 1, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z: 8 });
  Object.assign(m.athletes[1]!, { x: 0, z: 8 - gap });
  m.ball.holder = 0;
  m.ball.mode = "held";
  return m;
}

describe("what the phones are told", () => {
  it("offers Steal only right next to the ball handler", () => {
    expect(courtState(live(0.9), 1, PLAYERS).canSteal).toBe(true);
    expect(courtState(live(1.5), 1, PLAYERS).canSteal).toBe(false);
    // The ball handler's own third button is Dribble, never Steal.
    const m = live(0.9);
    expect(courtState(m, 0, PLAYERS)).toMatchObject({ hasBall: true, canSteal: false });
  });

  it("puts the fouled player on the free throw meter once set at the line", () => {
    const m = live(0.9);
    const normal = courtState(m, 0, PLAYERS).meter.halfMs;
    callFoul(m, m.athletes[1]!, m.athletes[0]!);
    expect(courtState(m, 0, PLAYERS).freeThrow).toEqual({ mine: true, n: 1, ready: false });
    expect(courtState(m, 1, PLAYERS).freeThrow).toEqual({ mine: false, n: 1, ready: false });
    for (let t = 0; t < 6 && !courtState(m, 0, PLAYERS).freeThrow?.ready; t += STEP) m.step(STEP);
    const mine = courtState(m, 0, PLAYERS);
    expect(mine.freeThrow).toEqual({ mine: true, n: 1, ready: true });
    expect(mine.checking).toBe(false);
    // The green band is wider at the line.
    expect(mine.meter.halfMs).toBeGreaterThan(normal);
    expect(freeThrowText(m)).toBe("Free throw 1 of 2");
  });
});
