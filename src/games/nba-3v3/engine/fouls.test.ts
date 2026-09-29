import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import type { MatchEvent } from "./events";
import { forceFoul } from "./foul-call";
import { frontness, handChance, inFront, shotsFor } from "./fouls";
import { Match, type Entry } from "./match";
import { gainPossession } from "./rules";
import { DEFENCE, STEP } from "./tuning";

const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: null }));

/**
 * A live match with player 0 holding the ball at the top facing the rim, and defender 1
 * `gap` away: square in front (toward the rim) or beside him.
 */
function onBall(seed: number, gap = 0.9, side = false): Match {
  const m = new Match({ entries: ENTRIES, seed, firstOffence: 0 });
  // Straight to live play: the countdown only costs time here.
  m.phase = "live";
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.5, vx: 0, vz: 0, y: 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z: 8, yaw: Math.PI });
  Object.assign(m.athletes[1]!, side ? { x: gap, z: 8, yaw: -Math.PI / 2 } : { x: 0, z: 8 - gap, yaw: 0 });
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

function foulRate(side: boolean, before: number, n = 200): number {
  let fouls = 0;
  for (let seed = 1; seed <= n; seed++) {
    const m = onBall(seed, 0.9, side);
    for (let i = 0; i < before; i++) m.stealLog.attempt(1, 0);
    if (swipe(m).some((e) => e.type === "foul")) fouls++;
  }
  return fouls / n;
}

describe("reaching in and fouls", () => {
  it("knows in front from beside and behind", () => {
    const m = onBall(1);
    const h = m.athletes[0]!;
    expect(frontness({ x: 0, z: 7 }, h)).toBeCloseTo(1);
    expect(inFront({ x: 0, z: 7 }, h)).toBe(true);
    expect(inFront({ x: 1, z: 8 }, h)).toBe(false);
    expect(inFront({ x: 0, z: 9 }, h)).toBe(false);
  });

  it("catches the hand more often with every reach in a possession", () => {
    expect(handChance(0)).toBe(0);
    expect(handChance(1)).toBeCloseTo(0.28);
    expect(handChance(3)).toBeGreaterThan(handChance(2));
    expect(handChance(20)).toBe(0.6);
  });

  it("gives two shots for a reach in, one after a made basket and three on a missed three", () => {
    expect(shotsFor(false, 2)).toBe(2);
    expect(shotsFor(true, 2)).toBe(1);
    expect(shotsFor(false, 3)).toBe(3);
  });

  it("never fouls from square in front", () => {
    expect(foulRate(false, 4, 80)).toBe(0);
  });

  it("fouls from the side when the swipe catches the hand", () => {
    const first = foulRate(true, 0);
    expect(first).toBeGreaterThan(0.18);
    expect(first).toBeLessThan(0.4);
    expect(foulRate(true, 3)).toBeGreaterThan(first);
  }, 30000);

  it("swipes at air from too far and counts nothing", () => {
    const far = onBall(1, DEFENCE.stealRange + 0.6);
    const events = swipe(far);
    expect(events.some((e) => e.type === "whiff")).toBe(true);
    expect(far.stealLog.count(1, 0)).toBe(0);
  });

  it("wipes the count when the other team gets the ball", () => {
    const m = onBall(3);
    m.stealLog.attempt(1, 0);
    m.stealLog.attempt(1, 0);
    gainPossession(m, m.athletes[2]!);
    expect(m.stealLog.count(1, 0)).toBe(2);
    gainPossession(m, m.athletes[1]!);
    expect(m.stealLog.count(1, 0)).toBe(0);
  });

  it("sends the ball handler to the line with the whistle and the referee", () => {
    const m = onBall(5);
    expect(forceFoul(m)).toBe(true);
    expect(m.phase).toBe("freeThrow");
    expect(m.freeThrows).toMatchObject({ shooter: 0, shots: 2, stage: "whistle" });
    expect(m.foulCall).toMatchObject({ kind: "reach", victim: 0 });
    expect(m.drainEvents().some((e) => e.type === "foul")).toBe(true);
  });
});
