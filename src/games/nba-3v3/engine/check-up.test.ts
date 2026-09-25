import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import type { MatchEvent } from "./events";
import { Match, type Entry } from "./match";
import { CHECK, COURT, RULES, STEP } from "./tuning";

/** Team 0 has a phone player in seat 1; team 1 has one in seat 2 on its second slot. */
const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: i === 0 ? 1 : i === 3 ? 2 : null }));

/** A live match where player 0 scores a sure basket from close in. */
function scored(checkBeat = true): { m: Match; events: MatchEvent[] } {
  const m = new Match({ entries: ENTRIES, seed: 5, firstOffence: 0 });
  m.checkBeat = checkBeat;
  while (m.phase !== "live") m.step(STEP);
  const a = m.athletes[0]!;
  Object.assign(a, { x: 0.8, z: 3.2, vx: 0, vz: 0 });
  m.ball.holder = 0;
  m.forced = "swish";
  m.press(0, "shoot");
  m.release(0, 600);
  const events: MatchEvent[] = [];
  for (let t = 0; t < 4 && m.phase === "live"; t += STEP) {
    m.step(STEP);
    events.push(...m.drainEvents());
  }
  return { m, events };
}

/** Steps until the phase changes, or gives up, and returns how long it took. */
function until(m: Match, phase: Match["phase"], events: MatchEvent[], max = 10): number {
  let t = 0;
  while (m.phase !== phase && t < max) {
    m.step(STEP);
    events.push(...m.drainEvents());
    t += STEP;
  }
  return t;
}

describe("the check up after a basket", () => {
  it("fetches the ball, walks everyone to the top and checks it to the team scored on", () => {
    const { m, events } = scored();
    expect(events.some((e) => e.type === "score")).toBe(true);
    expect(m.phase).toBe("dead");
    const dead = until(m, "check", events);
    expect(dead).toBeLessThan(CHECK.maxDead);
    const up = events.find((e) => e.type === "checkUp");
    expect(up?.type === "checkUp" && up.team).toBe(1);
    // The phone player on the team scored on brings it up, with the ball already in hand.
    const checker = m.athletes[3]!;
    expect(m.ball.holder).toBe(3);
    expect(Math.hypot(checker.x - COURT.check.x, checker.z - COURT.check.z)).toBeLessThan(CHECK.onSpot + 0.05);
  });

  it("pauses the clock and ignores the sticks and buttons, then play goes live", () => {
    const { m, events } = scored();
    until(m, "check", events);
    const spots = m.athletes.map((a) => ({ x: a.x, z: a.z }));
    let beat = 0;
    let bounces = 0;
    while (m.phase === "check" && beat < 5) {
      // Someone on a phone mashes everything; none of it counts.
      m.setMove(3, { x: 1, z: 0 });
      m.setMove(0, { x: 0, z: 1 });
      m.press(3, "shoot");
      m.press(0, "defend");
      m.step(STEP);
      bounces += m.drainEvents().filter((e) => e.type === "bounce").length;
      beat += STEP;
      if (m.phase === "check") expect(m.shotClock).toBe(RULES.shotClock);
    }
    expect(beat).toBeGreaterThan(1.5);
    expect(beat).toBeLessThan(2.5);
    expect(bounces).toBe(2);
    m.athletes.forEach((a, i) => expect(Math.hypot(a.x - spots[i]!.x, a.z - spots[i]!.z)).toBeLessThan(0.3));
    expect(m.phase).toBe("live");
    expect(m.offence).toBe(1);
    expect(m.ball.holder).toBe(3);
    expect(m.athletes[3]!.action.kind).toBe("none");
    // Now the clock runs.
    m.step(STEP * 10);
    expect(m.shotClock).toBeLessThan(RULES.shotClock);
  });

  it("checks the ball after an out of bounds turnover too", () => {
    const m = new Match({ entries: ENTRIES, seed: 5, firstOffence: 0 });
    while (m.phase !== "live") m.step(STEP);
    Object.assign(m.ball, { mode: "loose", holder: null, lastTouch: 0, pos: { x: 7.9, y: 0.3, z: 5 }, vel: { x: 0, y: 0, z: 0 } });
    m.step(STEP);
    expect(m.phase).toBe("dead");
    const events: MatchEvent[] = [];
    until(m, "live", events, 10);
    expect(events.some((e) => e.type === "checkUp")).toBe(true);
    expect(m.offence).toBe(1);
  });

  it("can be skipped for the showcase, going straight on", () => {
    const { m, events } = scored(false);
    const t = until(m, "live", events);
    expect(t).toBeLessThan(CHECK.quick + 0.1);
    expect(events.some((e) => e.type === "checkUp")).toBe(false);
    expect(m.ball.holder).toBe(3);
  });
});
