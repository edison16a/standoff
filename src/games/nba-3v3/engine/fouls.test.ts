import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import type { MatchEvent } from "./events";
import { foulChance } from "./fouls";
import { Match, type Entry } from "./match";
import { gainPossession } from "./rules";
import { DEFENCE, STEP } from "./tuning";

const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: null }));

/** A live match with player 0 holding the ball at the top and defender 1 right on them. */
function onBall(seed: number, gap = 0.9): Match {
  const m = new Match({ entries: ENTRIES, seed, firstOffence: 0 });
  // Straight to live play: the countdown only costs time here.
  m.phase = "live";
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.5, vx: 0, vz: 0, y: 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z: 8, yaw: Math.PI });
  Object.assign(m.athletes[1]!, { x: 0, z: 8 - gap, yaw: 0 });
  m.ball.holder = 0;
  m.ball.mode = "held";
  return m;
}

/** Swipes once with defender 1 and steps until it has played out. */
function swipe(m: Match): MatchEvent[] {
  const d = m.athletes[1]!;
  d.stealCd = 0;
  d.whiff = 0;
  m.press(1, "defend");
  const events: MatchEvent[] = [];
  for (let t = 0; t < 0.4; t += STEP) {
    m.step(STEP);
    events.push(...m.drainEvents());
  }
  return events;
}

describe("steals and the foul count", () => {
  it("gives the chances in the rules: none, none, 20, 40, then 60 percent", () => {
    expect([1, 2, 3, 4, 5, 6, 9].map(foulChance)).toEqual([0, 0, 0.2, 0.4, 0.6, 0.6, 0.6]);
  });

  it("only swipes from right next to the ball handler; further off it is a jump", () => {
    const near = onBall(1, 0.9);
    near.press(1, "defend");
    expect(near.athletes[1]!.action.kind).toBe("steal");
    const far = onBall(1, DEFENCE.stealRange + 0.3);
    far.press(1, "defend");
    expect(far.athletes[1]!.action.kind).toBe("block");
  });

  it("never fouls on the first two attempts", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const m = onBall(seed);
      m.stealLog.attempt(1, 0);
      const events = swipe(m);
      expect(events.some((e) => e.type === "foul")).toBe(false);
      // Counted, unless the swipe won the ball and the slate was wiped.
      if (!events.some((e) => e.type === "steal")) expect(m.stealLog.count(1, 0)).toBe(2);
    }
  });

  it("fouls on about one third attempt in five, and more after", () => {
    const rate = (before: number) => {
      let fouls = 0;
      const n = 300;
      for (let seed = 1; seed <= n; seed++) {
        const m = onBall(seed);
        for (let i = 0; i < before; i++) m.stealLog.attempt(1, 0);
        if (swipe(m).some((e) => e.type === "foul")) fouls++;
      }
      return fouls / n;
    };
    expect(rate(2)).toBeGreaterThan(0.13);
    expect(rate(2)).toBeLessThan(0.27);
    expect(rate(3)).toBeGreaterThan(0.31);
    expect(rate(3)).toBeLessThan(0.49);
    expect(rate(6)).toBeGreaterThan(0.5);
    expect(rate(6)).toBeLessThan(0.7);
  }, 30000);

  it("wipes the count when the other team gets the ball", () => {
    const m = onBall(3);
    m.stealLog.attempt(1, 0);
    m.stealLog.attempt(1, 0);
    gainPossession(m, m.athletes[2]!);
    expect(m.stealLog.count(1, 0)).toBe(2);
    gainPossession(m, m.athletes[1]!);
    expect(m.stealLog.count(1, 0)).toBe(0);
  });

  it("counts each defender on each ball handler on its own", () => {
    const m = onBall(4);
    m.stealLog.attempt(1, 0);
    m.stealLog.attempt(1, 0);
    m.stealLog.attempt(3, 0);
    m.stealLog.attempt(1, 2);
    expect(m.stealLog.count(1, 0)).toBe(2);
    expect(m.stealLog.count(3, 0)).toBe(1);
    expect(m.stealLog.count(1, 2)).toBe(1);
  });
});
