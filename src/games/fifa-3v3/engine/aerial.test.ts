import { describe, expect, it } from "vitest";
import { JUMP } from "./defend";
import type { MatchEvent } from "./events";
import { createMatch, stepMatch, type Entrant } from "./match";
import { BALL, MATCH, PITCH, STEP } from "./tuning";
import type { Command, MatchState } from "./types";
import type { Vec2 } from "./vec";

const LINEUP: Entrant[] = [
  { team: 0, build: "striker", seat: 1 },
  { team: 1, build: "defender", seat: null },
];

/** Red's striker (a phone) standing at `at`, the ball in the air at `ball` flying with `vel`; the defender far away. */
function airBall(at: Vec2, ball: { x: number; y: number; z: number }, vel: { x: number; y: number; z: number }): MatchState {
  const state = createMatch(LINEUP, { seed: 5, replays: false, level: "training" });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  const me = state.athletes[0]!;
  state.athletes[1]!.pos = { x: -20, z: 12 };
  me.pos = { ...at };
  me.vel = { x: 0, z: 0 };
  me.facing = Math.atan2(-vel.z, -vel.x);
  state.ball.owner = null;
  state.ball.pos = { ...ball };
  state.ball.vel = { ...vel };
  state.ball.spin = { x: 0, y: 0, z: 0 };
  state.ball.lastTouch = { team: 0, id: 1 };
  return state;
}

/** Steps with the phone's command and collects the events. */
function run(state: MatchState, seconds: number, command: (t: number) => Command = () => ({ move: { x: 0, z: 0 } })): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (let t = 0; t < seconds && state.phase === "play"; t += STEP) {
    stepMatch(state, new Map([[0, command(t)]]));
    events.push(...state.events);
  }
  return events;
}

/** A cross from the left at 12 m/s, flying across the box: at `height` over the player after `seconds`. */
const cross = (at: Vec2, height: number, seconds = 0.25) =>
  airBall(at, { x: at.x, y: height + 0.1, z: at.z - 12 * seconds }, { x: 0, y: (-0.1 + 0.5 * 9.81 * seconds * seconds) / seconds, z: 12 });

describe("headers", () => {
  it("near the goal he attacks, a cross met with the head is a shot, headed toward the goal", () => {
    const state = cross({ x: PITCH.halfLength - 7, z: 0 }, 1.7);
    const events = run(state, 0.5);
    const header = events.find((e) => e.type === "header");
    const shot = events.find((e) => e.type === "shot");
    expect(header).toBeDefined();
    expect(shot && shot.type === "shot" && shot.header).toBe(true);
    expect(state.flight).not.toBeNull();
    // Off the head it is slower than a strike, but on its way to the goal.
    expect(state.ball.vel.x).toBeGreaterThan(6);
    expect(Math.hypot(state.ball.vel.x, state.ball.vel.y, state.ball.vel.z)).toBeLessThan(23);
  });

  it("near his own goal, it is cleared high and long up the pitch", () => {
    const state = cross({ x: -PITCH.halfLength + 6, z: 1 }, 1.7);
    const events = run(state, 0.4);
    expect(events.some((e) => e.type === "header")).toBe(true);
    expect(events.some((e) => e.type === "shot")).toBe(false);
    expect(state.ball.vel.x).toBeGreaterThan(8);
    run(state, 3);
    expect(state.ball.pos.x).toBeGreaterThan(-PITCH.halfLength + 20);
  });

  it("a ball over his head starts a leap, and he meets it at the top of it", () => {
    const state = cross({ x: 0, z: 0 }, 2.25, 0.4);
    const me = state.athletes[0]!;
    let leapt = false;
    let metAt = 0;
    for (let t = 0; t < 0.6; t += STEP) {
      stepMatch(state, new Map([[0, { move: { x: 0, z: 0 } }]]));
      if (me.action === "header" && me.actionLen === JUMP.length) leapt = true;
      if (state.events.some((e) => e.type === "header")) metAt = state.ball.pos.y;
    }
    expect(leapt).toBe(true);
    expect(metAt).toBeGreaterThan(1.95);
  });
});

describe("the chest", () => {
  it("brings a dropping ball down at his feet, his to play", () => {
    const state = airBall({ x: 0, z: 0 }, { x: -4, y: 2.4, z: 0 }, { x: 9, y: -2, z: 0 });
    const events = run(state, 0.5);
    expect(events.some((e) => e.type === "control" && e.athlete === 0)).toBe(true);
    expect(events.some((e) => e.type === "header")).toBe(false);
    run(state, 1);
    expect(state.ball.owner).toEqual({ kind: "athlete", id: 0 });
    expect(state.ball.pos.y).toBeLessThan(BALL.radius + 0.2);
  });

  it("cannot kill a hard ball: one at his chest past 18 m/s hits him and flies off", () => {
    const state = airBall({ x: 0, z: 0 }, { x: -6, y: 1.25, z: 0 }, { x: 26, y: 1, z: 0 });
    const events = run(state, 0.5);
    expect(events.some((e) => e.type === "block" && e.athlete === 0)).toBe(true);
    expect(state.ball.owner).toBeNull();
  });
});

describe("the volley", () => {
  it("a shot pressed as the ball drops is struck in the air, first time", () => {
    // Dropping on him from six metres away, at shin height as it reaches him.
    const state = airBall({ x: PITCH.halfLength - 12, z: 0 }, { x: PITCH.halfLength - 18, y: 1.5, z: 0 }, { x: 10, y: 1.6, z: 0 });
    const me = state.athletes[0]!;
    me.facing = 0;
    const aim = { x: 1, z: 0 };
    const events = run(state, 1.2, (t) => ({ move: { x: 0, z: 0 }, shootDown: t < STEP, shootUp: t >= 0.3 && t < 0.3 + STEP, aim }));
    const shot = events.find((e) => e.type === "shot");
    expect(shot).toBeDefined();
    expect(events.some((e) => e.type === "control" && e.athlete === 0)).toBe(false);
    expect(me.firstTime).toBe(true);
  });
});
