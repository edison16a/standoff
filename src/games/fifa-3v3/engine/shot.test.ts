import { describe, expect, it } from "vitest";
import type { MatchEvent } from "./events";
import { startShot } from "./kick";
import { createMatch, stepMatch, type Entrant } from "./match";
import { Rng } from "./rng";
import { fly, solveKick } from "./shot-aim";
import { applyError, strikeError, type StrikeContext } from "./shot-error";
import { BALL, MATCH, PITCH, STEP } from "./tuning";
import type { MatchState } from "./types";

const HL = PITCH.halfLength;
const GW = PITCH.goalHalfWidth;
const LINEUP: Entrant[] = [
  { team: 0, build: "striker", seat: null },
  { team: 1, build: "defender", seat: null },
];

/** A match in play with the computer players standing still, and the keeper set in the middle of his goal. */
function still(seed: number): MatchState {
  const state = createMatch(LINEUP, { seed, replays: false, level: "training" });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  state.athletes[1]!.pos = { x: -10, z: 10 };
  return state;
}

/** The striker shoots from `at` at `aimZ` on the goal with a bar of `power`; returns what happened. */
function shoot(seed: number, at: { x: number; z: number }, aimZ: number, power: number, rig = false) {
  const state = still(seed);
  if (rig) state.options.rig = () => "goal";
  const me = state.athletes[0]!;
  me.pos = { ...at };
  me.facing = 0;
  me.vel = { x: 0, z: 0 };
  state.keepers[1].pos = { x: HL - 1.2, z: 0 };
  state.ball.owner = { kind: "athlete", id: 0 };
  state.ball.pos = { x: at.x + 0.35, y: BALL.radius, z: at.z };
  startShot(state, me, power, aimZ);
  const events: MatchEvent[] = [];
  for (let t = 0; t < 3 && state.phase === "play"; t += STEP) {
    stepMatch(state);
    events.push(...state.events);
  }
  const has = (type: MatchEvent["type"]) => events.some((e) => e.type === type);
  return { goal: has("goal"), save: has("save"), caught: events.some((e) => e.type === "save" && e.kind === "catch"), wood: has("woodwork"), miss: has("miss") || has("out"), state };
}

describe("the shot's flight", () => {
  it("passes through the chosen point before the striker's error", () => {
    const from = { x: 8, y: BALL.radius, z: -4 };
    const target = { x: HL, y: 1.2, z: 1.5 };
    const kick = solveKick(from, target, 26, 9);
    const hit = fly(from, kick, target.x);
    expect(hit).not.toBeNull();
    expect(Math.abs(hit!.z - target.z)).toBeLessThan(0.03);
    expect(Math.abs(hit!.y - target.y)).toBeLessThan(0.03);
  });

  it("beats the keeper when it is struck clean into a far corner from the edge of the box", () => {
    for (let seed = 1; seed <= 8; seed++) expect(shoot(seed, { x: HL - 13, z: 2 }, -(GW - 0.6), 0.55, true).goal).toBe(true);
  });

  it("is saved by the keeper's gloves when struck at him, held when it is soft", () => {
    let saves = 0;
    let held = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const shot = shoot(seed, { x: HL - 14, z: 0 }, 0.3, 0.2);
      if (shot.save) saves++;
      if (shot.caught) held++;
    }
    expect(saves).toBeGreaterThan(8);
    expect(held).toBeGreaterThan(4);
  });

  it("goes in sometimes and is saved sometimes from the same spot, by the strike's error and the keeper's read", () => {
    let goals = 0;
    let saves = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const shot = shoot(seed, { x: HL - 12, z: -3 }, GW - 1.2, 0.6);
      if (shot.goal) goals++;
      if (shot.save) saves++;
    }
    expect(goals).toBeGreaterThan(6);
    expect(saves).toBeGreaterThan(6);
  });
});

describe("the strike's error", () => {
  const base: StrikeContext = { finishing: 0.85, spread: 0.17, red: 0, pressure: 0.2, firstTime: false, pace: 0.4, volley: false };
  /** Shares of strikes from 14 m that cross inside the posts and under the bar. */
  function onTarget(c: StrikeContext): { inside: number; over: number } {
    const rng = new Rng(9);
    const from = { x: HL - 14, y: BALL.radius, z: 0 };
    const kick = solveKick(from, { x: HL, y: c.red > 0 ? 2.2 : 0.9, z: 2.6 }, 25, 0);
    let inside = 0;
    let over = 0;
    const n = 300;
    for (let i = 0; i < n; i++) {
      const hit = fly(from, applyError(kick, strikeError(c, rng)), HL);
      if (!hit) continue;
      if (hit.y > PITCH.goalHeight) over++;
      else if (Math.abs(hit.z) < GW) inside++;
    }
    return { inside: inside / n, over: over / n };
  }

  it("keeps a clean green strike on target nearly every time", () => {
    expect(onTarget(base).inside).toBeGreaterThan(0.85);
  });

  it("sprays a full red strike wide and over far more often", () => {
    const red = onTarget({ ...base, spread: 0.75, red: 1 });
    expect(red.over).toBeGreaterThan(0.15);
    expect(red.inside).toBeLessThan(onTarget(base).inside - 0.15);
  });

  it("is worse under pressure, first time and on the volley", () => {
    const calm = onTarget(base).inside;
    expect(onTarget({ ...base, pressure: 1 }).inside).toBeLessThan(calm);
    expect(onTarget({ ...base, firstTime: true, volley: true }).inside).toBeLessThan(calm);
  });
});
