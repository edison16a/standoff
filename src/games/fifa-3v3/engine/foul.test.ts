import { describe, expect, it } from "vitest";
import type { MatchEvent } from "./events";
import { commitFoul, FOUL } from "./foul";
import { createMatch, stepMatch, type Entrant } from "./match";
import { penaltySpot } from "./set-piece";
import { foulChance } from "./tackle";
import { MATCH, PITCH, STEP } from "./tuning";
import type { MatchState } from "./types";
import { dist } from "./vec";
import { WALL } from "./wall";

const LINEUP: Entrant[] = [
  { team: 0, character: "echeverri", seat: 1 },
  { team: 0, character: "brandao", seat: null },
  { team: 0, character: "okemba", seat: null },
  { team: 1, character: "holmvik", seat: null },
  { team: 1, character: "lacerda", seat: null },
  { team: 1, character: "serrano", seat: null },
];

function inPlay(seed = 5): MatchState {
  const state = createMatch(LINEUP, { seed, replays: false });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  return state;
}

function runUntil(state: MatchState, phase: string, seconds: number): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (let t = 0; t < seconds && state.phase !== phase; t += STEP) {
    stepMatch(state);
    events.push(...state.events);
  }
  return events;
}

/** Our man fouled by Blue's first player at a spot, Red attacking the right hand goal. */
function fouledAt(x: number, z: number): { state: MatchState; events: MatchEvent[] } {
  const state = inPlay();
  const me = state.athletes[0]!;
  me.pos = { x, z };
  const events: MatchEvent[] = [];
  commitFoul(state, state.athletes[3]!, me, "slide");
  events.push(...state.events);
  return { state, events };
}

describe("fouls", () => {
  it("calls a slide through the back of a man nearly every time, and a clean one almost never", () => {
    expect(foulChance(1, false)).toBeGreaterThan(0.9);
    expect(foulChance(0.6, false)).toBeGreaterThan(0.6);
    expect(foulChance(0, false)).toBeLessThan(0.05);
    expect(foulChance(0.2, true)).toBeGreaterThan(foulChance(0.2, false));
  });

  it("stops play, books the offender and sets up a free kick outside the box", () => {
    const { state, events } = fouledAt(PITCH.halfLength - 14, 3);
    expect(state.phase).toBe("foul");
    expect(events.some((e) => e.type === "foul" && !e.penalty)).toBe(true);
    expect(state.athletes[3]!.stats.fouls).toBe(1);
    const later = runUntil(state, "setpiece", FOUL.maxRun + FOUL.card + 2);
    expect(later.some((e) => e.type === "card" && e.athlete === 3)).toBe(true);
    expect(state.phase).toBe("setpiece");
    expect(state.setPiece?.kind).toBe("free");
    expect(state.ball.pos.x).toBeCloseTo(PITCH.halfLength - 14, 5);
  });

  it("sends the referee to the spot before the card comes out", () => {
    const { state } = fouledAt(PITCH.halfLength - 14, -4);
    runUntil(state, "setpiece", 10);
    // He stands a stride from where it happened when the scene cuts.
    expect(dist(state.referee.pos, { x: PITCH.halfLength - 14, z: -4 })).toBeLessThan(12);
    expect(state.setPiece).not.toBeNull();
  });

  it("gives a penalty for a foul in the box", () => {
    const { state, events } = fouledAt(PITCH.halfLength - 4, 1);
    expect(events.some((e) => e.type === "foul" && e.penalty)).toBe(true);
    runUntil(state, "setpiece", 10);
    expect(state.setPiece?.kind).toBe("penalty");
    const spot = penaltySpot(1);
    expect(state.ball.pos.x).toBeCloseTo(spot.x, 5);
    expect(state.ball.pos.z).toBeCloseTo(0, 5);
  });

  it("lines up a wall of three ten yards from the ball, with the keeper on the far side", () => {
    const { state } = fouledAt(PITCH.halfLength - 20, 5);
    runUntil(state, "setpiece", 10);
    const sp = state.setPiece!;
    expect(sp.wall).toHaveLength(3);
    for (const id of sp.wall) {
      const a = state.athletes[id]!;
      expect(a.team).toBe(1);
      expect(dist(a.pos, sp.spot)).toBeGreaterThan(WALL.distance - 0.6);
      expect(dist(a.pos, sp.spot)).toBeLessThan(WALL.distance + 0.6);
    }
    // The ball is on the near side (+z), so the keeper shades the far one.
    expect(state.keepers[1].pos.z).toBeLessThan(0);
  });

  it("keeps everyone else outside the box for a penalty", () => {
    const { state } = fouledAt(PITCH.halfLength - 3, -1);
    runUntil(state, "setpiece", 10);
    const sp = state.setPiece!;
    for (const a of state.athletes) {
      if (a.id === sp.taker) continue;
      expect(dist(a.pos, { x: PITCH.halfLength, z: 0 })).toBeGreaterThan(PITCH.boxRadius);
    }
    expect(Math.abs(state.keepers[1].pos.x - PITCH.halfLength)).toBeLessThan(0.5);
  });
});
