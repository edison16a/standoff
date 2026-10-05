import { describe, expect, it } from "vitest";
import { footPoint } from "./athlete";
import type { MatchEvent } from "./events";
import { createMatch, stepMatch, type Entrant } from "./match";
import { MATCH, STEP } from "./tuning";
import type { MatchState } from "./types";
import type { Vec2 } from "./vec";

const LINEUP: Entrant[] = [
  { team: 0, build: "winger", seat: 1 },
  { team: 1, build: "defender", seat: null },
];

/** Whether a player has the ball: read through a call, since the test sets the owner by hand. */
const owned = (state: MatchState) => state.ball.owner?.kind === "athlete";

/** The phone's winger on the ball in his own half, the defender frozen far away. */
function onTheBall(seed = 3): MatchState {
  const state = createMatch(LINEUP, { seed, replays: false, level: "training" });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  const me = state.athletes[0]!;
  state.athletes[1]!.pos = { x: -20, z: 12 };
  me.pos = { x: -18, z: 0 };
  state.ball.owner = { kind: "athlete", id: 0 };
  state.ball.pos = { ...footPoint(me), y: 0.11 };
  return state;
}

/** Runs with the stick for `seconds`; returns the touches taken, the furthest the ball got from the boot, and whether it was kept. */
function dribble(stick: (t: number) => Vec2, seconds = 5) {
  const state = onTheBall();
  const me = state.athletes[0]!;
  let touches = 0;
  let last = me.touchStride;
  let widest = 0;
  for (let t = 0; t < seconds; t += STEP) {
    stepMatch(state, new Map([[0, { move: stick(t) }]]));
    if (me.touchStride !== last) touches++;
    last = me.touchStride;
    const f = footPoint(me);
    widest = Math.max(widest, Math.hypot(f.x - state.ball.pos.x, f.z - state.ball.pos.z));
  }
  return { touches, widest, kept: state.ball.owner?.kind === "athlete" && state.ball.owner.id === 0 };
}

describe("the dribble", () => {
  it("is real touches: the ball is knocked on every second or so at a sprint and stays within a stride", () => {
    const run = dribble(() => ({ x: 1, z: 0 }));
    expect(run.kept).toBe(true);
    expect(run.touches).toBeGreaterThanOrEqual(3);
    expect(run.touches).toBeLessThan(12);
    expect(run.widest).toBeLessThan(1.8);
  });

  it("takes many small touches walking it", () => {
    const walk = dribble(() => ({ x: 0.3, z: 0.1 }));
    expect(walk.kept).toBe(true);
    expect(walk.widest).toBeLessThan(0.7);
    expect(walk.touches).toBeGreaterThan(5);
  });

  it("keeps the ball through a zigzag, a turn back and a stop", () => {
    expect(dribble((t) => ({ x: 0.8, z: Math.sin(t * 2.5) > 0 ? 0.6 : -0.6 })).kept).toBe(true);
    expect(dribble((t) => ({ x: t < 2 ? 1 : -1, z: 0 })).kept).toBe(true);
    expect(dribble((t) => (Math.floor(t) % 2 === 0 ? { x: 1, z: 0 } : { x: 0, z: 0 })).kept).toBe(true);
  });
});

describe("the first touch", () => {
  /** Fires a ball at the winger standing still and reports whether he brought it under control. */
  function receive(speed: number, seed: number, build: Entrant["build"] = "winger"): boolean {
    const state = createMatch([{ team: 0, build, seat: 1 }, LINEUP[1]!], { seed, replays: false, level: "training" });
    for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
    const me = state.athletes[0]!;
    state.athletes[1]!.pos = { x: -20, z: 12 };
    me.pos = { x: 0, z: 0 };
    me.facing = Math.PI;
    state.ball.owner = null;
    state.ball.pos = { x: -8, y: 0.11, z: 0 };
    state.ball.vel = { x: speed, y: 0, z: 0 };
    state.ball.spin = { x: 0, y: 0, z: -speed / 0.11 };
    state.ball.passTo = 0;
    for (let t = 0; t < 2; t += STEP) {
      stepMatch(state, new Map([[0, { move: { x: 0, z: 0 } }]]));
      if (owned(state)) return Math.hypot(state.ball.pos.x - me.pos.x, state.ball.pos.z - me.pos.z) < 1.6;
    }
    return false;
  }

  it("kills a firm pass dead and bounces more of a hard one off a poor touch", () => {
    let soft = 0;
    let hardGood = 0;
    let hardPoor = 0;
    for (let seed = 1; seed <= 20; seed++) {
      if (receive(8, seed)) soft++;
      if (receive(26, seed)) hardGood++;
      if (receive(26, seed, "defender")) hardPoor++;
    }
    expect(soft).toBe(20);
    expect(hardGood).toBeGreaterThan(hardPoor);
  });
});

describe("reaction", () => {
  it("never lets a man take a pass off the boot the instant it is struck: he has to react, and it can hit his legs", () => {
    const state = onTheBall();
    const me = state.athletes[0]!;
    const foe = state.athletes[1]!;
    me.pos = { x: 0, z: 0 };
    me.facing = 0;
    state.ball.pos = { ...footPoint(me), y: 0.11 };
    foe.pos = { x: 1.4, z: 0.45 };
    const events: MatchEvent[] = [];
    stepMatch(state, new Map([[0, { move: { x: 0, z: 0 }, shootDown: true, aim: { x: 1, z: 0 } }]]));
    for (let t = 0; t < 0.6; t += STEP) {
      stepMatch(state, new Map([[0, { move: { x: 0, z: 0 }, shootUp: t < STEP, aim: { x: 1, z: 0 } }]]));
      events.push(...state.events);
    }
    const pass = events.findIndex((e) => e.type === "pass");
    expect(pass).toBeGreaterThanOrEqual(0);
    // Off his shins or past him, but not in his control the moment it is hit.
    const taken = events.slice(pass).find((e) => e.type === "control" && e.athlete === 1);
    expect(taken === undefined || events.slice(pass).some((e) => e.type === "block")).toBe(true);
  });
});
