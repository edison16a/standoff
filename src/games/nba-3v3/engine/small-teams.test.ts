import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import type { MatchEvent } from "./events";
import { callFoul } from "./foul-call";
import { Match, type Entry } from "./match";
import { STEP } from "./tuning";
import type { TeamId } from "./types";

/** `home` players on team 0 and `away` on team 1, each a different build. */
function teams(home: number, away: number, seats = false): Entry[] {
  const sides: TeamId[] = [...Array<TeamId>(home).fill(0), ...Array<TeamId>(away).fill(1)];
  return sides.map((team, i) => ({ team, build: BUILD_IDS[i]!, seat: seats ? i + 1 : null }));
}

function playOut(entries: Entry[], seed: number, maxSeconds = 1500): { match: Match; events: MatchEvent[] } {
  const match = new Match({ entries, seed });
  const events: MatchEvent[] = [];
  for (let t = 0; t < maxSeconds && match.phase !== "over"; t += STEP) {
    match.step(STEP);
    events.push(...match.drainEvents());
  }
  return { match, events };
}

describe("games with fewer than three a side", () => {
  const shapes: [number, number][] = [[1, 1], [2, 2], [1, 2], [2, 1], [3, 1], [1, 3], [2, 3]];
  for (const [home, away] of shapes) {
    it(`plays a ${home} on ${away} game to the end`, () => {
      const { match, events } = playOut(teams(home, away), 5);
      expect(match.phase).toBe("over");
      expect(Math.max(...match.score)).toBeGreaterThanOrEqual(match.target);
      // Balls go dead and get checked up again; on an even floor both sides get their turn.
      const teamsChecking = new Set(events.flatMap((e) => (e.type === "check" ? [e.team] : [])));
      expect(teamsChecking.size).toBeGreaterThan(0);
      if (home === away) expect(teamsChecking).toEqual(new Set([0, 1]));
    }, 60000);
  }

  it("has every defender guard someone or help, even when outnumbered", () => {
    const m = new Match({ entries: teams(1, 3), seed: 2, firstOffence: 0 });
    while (m.phase !== "live") m.step(STEP);
    const start = m.athletes.filter((a) => a.team === 1).map((a) => ({ x: a.x, z: a.z }));
    for (let t = 0; t < 2; t += STEP) m.step(STEP);
    // Nobody stands frozen on their check spot while the one attacker plays.
    const moved = m.athletes.filter((a) => a.team === 1).filter((a, i) => Math.hypot(a.x - start[i]!.x, a.z - start[i]!.z) > 0.3);
    expect(moved.length).toBeGreaterThanOrEqual(2);
  });

  it("does nothing on a pass with nobody to pass to", () => {
    const m = new Match({ entries: teams(1, 1, true), seed: 4, firstOffence: 0 });
    while (m.phase !== "live") m.step(STEP);
    m.press(0, "pass", { x: 1, z: 0 });
    expect(m.ball.holder).toBe(0);
    expect(m.drainEvents().some((e) => e.type === "pass")).toBe(false);
  });

  it("checks up one on one: the lone defender takes the check", () => {
    const m = new Match({ entries: teams(1, 1), seed: 3, firstOffence: 1 });
    expect(m.ball.holder).toBe(1);
    const events: MatchEvent[] = [];
    for (let t = 0; t < 30 && !events.some((e) => e.type === "checkUp"); t += STEP) {
      m.step(STEP);
      events.push(...m.drainEvents());
    }
    const check = events.find((e) => e.type === "checkUp");
    if (check?.type === "checkUp") expect(check.defender).not.toBe(check.id);
  });

  it("shoots both free throws one on one and plays on", () => {
    const m = new Match({ entries: teams(1, 1), seed: 6, firstOffence: 0 });
    while (m.phase !== "live") m.step(STEP);
    m.ball.holder = 0;
    m.ball.mode = "held";
    callFoul(m, m.athletes[1]!, m.athletes[0]!);
    const events: MatchEvent[] = [];
    // Read through a function so the compiler does not keep the phase narrowed to "live".
    const phase = (): string => m.phase;
    for (let t = 0; t < 20 && phase() === "freeThrow"; t += STEP) {
      m.step(STEP);
      events.push(...m.drainEvents());
    }
    expect(phase()).not.toBe("freeThrow");
    expect(events.filter((e) => e.type === "freeThrow")).toHaveLength(2);
  });
});
