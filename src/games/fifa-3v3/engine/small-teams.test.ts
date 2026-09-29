import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import type { TeamId } from "../teams";
import type { MatchEvent } from "./events";
import { laneOf } from "./lanes";
import { createMatch, stepMatch, type Entrant } from "./match";
import { STEP } from "./tuning";
import type { MatchState } from "./types";

/** `home` outfield players on team 0 and `away` on team 1, each a different build. */
function teams(home: number, away: number, seats = false): Entrant[] {
  const sides: TeamId[] = [...Array<TeamId>(home).fill(0), ...Array<TeamId>(away).fill(1)];
  return sides.map((team, i) => ({ team, build: BUILD_IDS[i]!, seat: seats ? i + 1 : null }));
}

function playOut(entrants: Entrant[], seed: number): { state: MatchState; events: MatchEvent[] } {
  const state = createMatch(entrants, { seed, replays: false });
  const events: MatchEvent[] = [];
  for (let t = 0; t < 600 && state.phase !== "fulltime"; t += STEP) {
    stepMatch(state);
    events.push(...state.events);
    for (const a of state.athletes) if (!Number.isFinite(a.pos.x + a.pos.z)) throw new Error("A player left the world.");
  }
  return { state, events };
}

describe("matches with fewer than three a side", () => {
  const shapes: [number, number][] = [[1, 1], [2, 2], [1, 2], [2, 1], [3, 1], [1, 3], [2, 3]];
  for (const [home, away] of shapes) {
    it(`plays a ${home} on ${away} match to the final whistle`, () => {
      const { state, events } = playOut(teams(home, away), 3);
      expect(state.phase).toBe("fulltime");
      expect(state.winner).not.toBeNull();
      // Both keepers stay in the match and are called on.
      expect(state.keepers).toHaveLength(2);
      expect(events.some((e) => e.type === "shot")).toBe(true);
      expect(events.some((e) => e.type === "save" || e.type === "throw")).toBe(true);
    }, 60000);
  }

  it("lines a pair up one behind the other, down the middle, at kick off", () => {
    const state = createMatch(teams(2, 1), { seed: 1 });
    const [first, second] = state.athletes.filter((a) => a.team === 0);
    expect(laneOf(state, first!)).toBe(0);
    expect(laneOf(state, second!)).toBe(0);
    expect(second!.pos.z).toBe(0);
    expect(Math.abs(second!.pos.x)).toBeGreaterThan(Math.abs(first!.pos.x));
  });

  it("still spreads a three across the pitch", () => {
    const state = createMatch(teams(3, 3), { seed: 1 });
    const lanes = state.athletes.filter((a) => a.team === 0).map((a) => laneOf(state, a));
    expect(lanes).toEqual([0, -1, 1]);
  });

  it("kicks off one on one with the lone player on the ball", () => {
    const state = createMatch(teams(1, 1), { seed: 2 });
    for (let t = 0; t < 5 && state.phase === "kickoff"; t += STEP) stepMatch(state);
    expect(state.phase).toBe("play");
    expect(state.ball.owner).toEqual({ kind: "athlete", id: state.kickoffTeam === 0 ? 0 : 1 });
  });

  it("plays a pass with nobody to pass to into space", () => {
    const state = createMatch(teams(1, 1, true), { seed: 2 });
    for (let t = 0; t < 5 && state.phase === "kickoff"; t += STEP) stepMatch(state);
    const kicker = state.kickoffTeam === 0 ? 0 : 1;
    const still = { x: 0, z: 0 };
    const events: MatchEvent[] = [];
    // A tap of Shoot/Pass: down, then up a moment later.
    const taps = [{ move: still, shootDown: true }, { move: still, shootUp: true, held: 0.05 }];
    for (let i = 0; i < 90; i++) {
      stepMatch(state, new Map([[kicker, taps[i] ?? { move: still }]]));
      events.push(...state.events);
    }
    const pass = events.find((e) => e.type === "pass");
    expect(pass).toBeDefined();
    if (pass?.type === "pass") expect(pass.to).toBeNull();
  });
});
