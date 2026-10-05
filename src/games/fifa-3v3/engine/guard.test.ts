import { describe, expect, it } from "vitest";
import { markSpot } from "./bot-shape";
import { jumpHeight, JUMP } from "./defend";
import { GUARD, markOf } from "./guard";
import { createMatch, stepMatch, type Entrant } from "./match";
import { MATCH, STEP } from "./tuning";
import type { Command, MatchState } from "./types";
import { dist } from "./vec";

/** Red's first player is a phone; Blue's first player has the ball. */
const LINEUP: Entrant[] = [
  { team: 0, build: "playmaker", seat: 1 },
  { team: 0, build: "striker", seat: null },
  { team: 0, build: "allrounder", seat: null },
  { team: 1, build: "keeper", seat: null },
  { team: 1, build: "winger", seat: null },
  { team: 1, build: "defender", seat: null },
];

/** In play, the computers frozen (Training), Blue's striker on the ball in midfield and our man near him. */
function defending(gap: number): MatchState {
  const state = createMatch(LINEUP, { seed: 4, replays: false, level: "training" });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  const me = state.athletes[0]!;
  const striker = state.athletes[3]!;
  striker.pos = { x: 0, z: 0 };
  me.pos = { x: gap, z: 2 };
  for (const a of state.athletes) if (a !== me && a !== striker) a.pos = { x: -18 + a.id, z: -10 };
  state.ball.owner = { kind: "athlete", id: striker.id };
  state.ball.lastTouch = { team: 1, id: striker.id };
  state.ball.heldFor = 5;
  return state;
}

function hold(state: MatchState, seconds: number, command: Command): void {
  for (let t = 0; t < seconds; t += STEP) stepMatch(state, new Map([[0, command]]));
}

describe("guard", () => {
  it("marks the opponent in the same place in the line up", () => {
    const state = defending(3);
    expect(markOf(state, state.athletes[0]!)?.id).toBe(3);
    expect(markOf(state, state.athletes[4]!)?.id).toBe(1);
  });

  it("takes the defender goal side of his man at the marking distance", () => {
    const state = defending(4);
    hold(state, 2.5, { move: { x: 0, z: 0 }, guard: true });
    const me = state.athletes[0]!;
    const spot = markSpot(me, state.athletes[3]!, GUARD.gap);
    expect(me.guard.on).toBe(true);
    expect(dist(me.pos, spot)).toBeLessThan(0.3);
    // Red defends the left goal, so goal side is to the left of the striker.
    expect(me.pos.x).toBeLessThan(state.athletes[3]!.pos.x);
  });

  it("does nothing out of range", () => {
    const state = defending(GUARD.range + 3);
    const before = { ...state.athletes[0]!.pos };
    hold(state, 1, { move: { x: 0, z: 0 }, guard: true });
    expect(state.athletes[0]!.guard.on).toBe(false);
    expect(dist(state.athletes[0]!.pos, before)).toBeLessThan(0.05);
  });

  it("hands control back when the stick is pushed", () => {
    const state = defending(4);
    hold(state, 0.5, { move: { x: 0, z: 1 }, guard: true });
    const me = state.athletes[0]!;
    expect(me.guard.on).toBe(false);
    expect(me.vel.z).toBeGreaterThan(3);
  });

  it("is slower than running flat out", () => {
    const state = defending(6.5);
    let fastest = 0;
    for (let t = 0; t < 1.5; t += STEP) {
      stepMatch(state, new Map([[0, { move: { x: 0, z: 0 }, guard: true }]]));
      fastest = Math.max(fastest, Math.hypot(state.athletes[0]!.vel.x, state.athletes[0]!.vel.z));
    }
    const free = defending(6.5);
    let flat = 0;
    for (let t = 0; t < 1.5; t += STEP) {
      stepMatch(free, new Map([[0, { move: { x: -1, z: 0 } }]]));
      flat = Math.max(flat, Math.hypot(free.athletes[0]!.vel.x, free.athletes[0]!.vel.z));
    }
    expect(fastest).toBeLessThan(flat * 0.85);
  });

  it("trails a skill move more than a man standing still", () => {
    const trail = (skill: boolean) => {
      const state = defending(4);
      hold(state, 2, { move: { x: 0, z: 0 }, guard: true });
      const striker = state.athletes[3]!;
      // The striker darts sideways, in a skill move or just running.
      striker.pos = { x: striker.pos.x, z: striker.pos.z + 2.5 };
      if (skill) {
        striker.action = "skill";
        striker.actionLen = 5;
        striker.actionT = 0;
      }
      // Most of a second: a body takes a moment to get going, so the guard needs time to show its lag.
      hold(state, 0.9, { move: { x: 0, z: 0 }, guard: true });
      const me = state.athletes[0]!;
      return dist(me.pos, markSpot(me, striker, GUARD.gap));
    };
    expect(trail(true)).toBeGreaterThan(trail(false) + 0.3);
  });
});

describe("jump", () => {
  it("rises and lands in its time", () => {
    const at = (t: number) => jumpHeight({ action: "jump", actionT: t, actionLen: JUMP.length });
    expect(at(0)).toBe(0);
    expect(at(JUMP.length / 2)).toBeCloseTo(JUMP.height, 5);
    expect(at(JUMP.length)).toBe(0);
  });
});
