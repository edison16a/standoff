import { describe, expect, it } from "vitest";
import { autoShootAt, CHARGE, chargeLevel, chargeZone, heldFor, isTap, shotSpread } from "./charge";
import { createMatch, stepMatch, type Entrant } from "./match";
import { MATCH, STEP } from "./tuning";
import type { Command, MatchState } from "./types";
import type { MatchEvent } from "./events";

describe("the charge bar", () => {
  it("is a tap below the threshold and fills from empty to full after it", () => {
    expect(isTap(0.1)).toBe(true);
    expect(isTap(CHARGE.tap)).toBe(false);
    expect(chargeLevel(CHARGE.tap)).toBe(0);
    expect(chargeLevel(CHARGE.tap + CHARGE.fill / 2)).toBeCloseTo(0.5, 6);
    expect(chargeLevel(10)).toBe(1);
    expect(chargeLevel(heldFor(0.7))).toBeCloseTo(0.7, 6);
  });

  it("runs green, yellow, red", () => {
    expect(chargeZone(0.2)).toBe("green");
    expect(chargeZone(0.6)).toBe("yellow");
    expect(chargeZone(0.9)).toBe("red");
  });

  it("gets less accurate with every step of power, steeply in the red", () => {
    const levels = [0, 0.25, 0.5, 0.75, 0.85, 1];
    const spreads = levels.map(shotSpread);
    for (let i = 1; i < spreads.length; i++) expect(spreads[i]!).toBeGreaterThan(spreads[i - 1]!);
    expect(shotSpread(1) - shotSpread(0.8)).toBeGreaterThan(shotSpread(0.5) - shotSpread(0.3));
  });
});

const LINEUP: Entrant[] = [
  { team: 0, character: "echeverri", seat: 1 },
  { team: 0, character: "brandao", seat: null },
  { team: 0, character: "okemba", seat: null },
  { team: 1, character: "holmvik", seat: null },
  { team: 1, character: "lacerda", seat: null },
  { team: 1, character: "ashworth", seat: null },
];

/** Red's phone player on the ball in open play, everyone else far away. */
function onTheBall(x = 8): MatchState {
  const state = createMatch(LINEUP, { seed: 4, replays: false });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  for (const a of state.athletes) if (a.id !== 0) a.pos = { x: -16 + a.id, z: a.team === 0 ? -10 : 10 };
  state.athletes[0]!.pos = { x, z: 0 };
  state.ball.owner = { kind: "athlete", id: 0 };
  return state;
}

/** Holds Shoot/Pass for `seconds`, then lets go, and collects what happened. */
function press(state: MatchState, seconds: number, aim = { x: 1, z: 0 }, after = 0.6): MatchEvent[] {
  const events: MatchEvent[] = [];
  const hold = Math.max(1, Math.round(seconds / STEP));
  for (let i = 0; i <= hold + after / STEP; i++) {
    const command: Command = { move: { x: 0, z: 0 }, aim, shootDown: i === 0, shootUp: i === hold };
    stepMatch(state, new Map([[0, command]]));
    events.push(...state.events);
  }
  return events;
}

describe("Shoot/Pass", () => {
  it("passes on a tap, even pointed at goal", () => {
    const events = press(onTheBall(), 0.08);
    expect(events.some((e) => e.type === "pass" && e.athlete === 0)).toBe(true);
    expect(events.some((e) => e.type === "shot")).toBe(false);
  });

  it("shoots on a hold, as hard as the bar was full", () => {
    const soft = press(onTheBall(), heldFor(0.25)).find((e) => e.type === "shot");
    const hard = press(onTheBall(), heldFor(0.95)).find((e) => e.type === "shot");
    expect(soft?.type === "shot" && soft.power).toBeCloseTo(0.25, 1);
    expect(hard?.type === "shot" && hard.power).toBeCloseTo(0.95, 1);
  });

  it("trusts the phone's own measure of the hold", () => {
    const state = onTheBall();
    stepMatch(state, new Map([[0, { move: { x: 0, z: 0 }, shootDown: true }]]));
    stepMatch(state, new Map([[0, { move: { x: 0, z: 0 }, shootUp: true, held: heldFor(0.6), aim: { x: 1, z: 0 } }]]));
    const events: MatchEvent[] = [];
    for (let t = 0; t < 0.6; t += STEP) {
      stepMatch(state);
      events.push(...state.events);
    }
    const shot = events.find((e) => e.type === "shot");
    expect(shot?.type === "shot" && shot.power).toBeCloseTo(0.6, 1);
  });

  it("shoots by itself at full power when held far too long", () => {
    const state = onTheBall();
    const events: MatchEvent[] = [];
    for (let t = 0; t < autoShootAt() + 0.6; t += STEP) {
      stepMatch(state, new Map([[0, { move: { x: 0, z: 0 }, shootDown: t === 0 }]]));
      events.push(...state.events);
    }
    const shot = events.find((e) => e.type === "shot");
    expect(shot?.type === "shot" && shot.power).toBe(1);
  });

  it("shows the bar only past a tap, and slows the run while it fills", () => {
    const state = onTheBall();
    const me = state.athletes[0]!;
    stepMatch(state, new Map([[0, { move: { x: 1, z: 0 }, shootDown: true }]]));
    expect(me.charging).toBe(true);
    for (let t = 0; t < 0.5; t += STEP) stepMatch(state, new Map([[0, { move: { x: 1, z: 0 } }]]));
    expect(me.charge).toBeGreaterThan(CHARGE.tap);
    expect(Math.hypot(me.vel.x, me.vel.z)).toBeLessThan(6);
  });
});
