import { describe, expect, it } from "vitest";
import type { MatchEvent } from "./events";
import { createMatch, stepMatch, type Entrant } from "./match";
import { makeSave } from "./keeper";
import { fullTime } from "./rules";
import { BALL, MATCH, PITCH, STEP } from "./tuning";
import type { Command, MatchState } from "./types";

const HL = PITCH.halfLength;

const LINEUP: Entrant[] = [
  { team: 0, character: "messi", seat: 1 },
  { team: 0, character: "ronaldo", seat: null },
  { team: 0, character: "mbappe", seat: null },
  { team: 1, character: "haaland", seat: null },
  { team: 1, character: "vinicius", seat: null },
  { team: 1, character: "bellingham", seat: null },
];

/** A match just after the kick off whistle, with the phone's player on the ball. */
function inPlay(): MatchState {
  const state = createMatch(LINEUP, { seed: 3, replays: false });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  expect(state.phase).toBe("play");
  return state;
}

/** Everyone but the phone's player is moved far away, so nobody interferes. */
function clearAround(state: MatchState): void {
  for (const a of state.athletes) if (a.id !== 0) a.pos = { x: -12 + a.id * 0.9, z: a.team === 0 ? -8 : 8 };
}

function run(state: MatchState, seconds: number, command?: Command): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (let t = 0; t < seconds; t += STEP) {
    stepMatch(state, new Map(command ? [[0, command]] : []));
    events.push(...state.events);
  }
  return events;
}

describe("open play", () => {
  it("keeps a dribbled ball inside the side boards", () => {
    const state = inPlay();
    clearAround(state);
    const me = state.athletes[0]!;
    me.pos = { x: 0, z: PITCH.halfWidth - 1.5 };
    state.ball.owner = { kind: "athlete", id: 0 };
    let widest = 0;
    for (let t = 0; t < 2; t += STEP) {
      stepMatch(state, new Map([[0, { move: { x: 0.2, z: 1 } }]]));
      widest = Math.max(widest, Math.abs(state.ball.pos.z));
    }
    expect(state.ball.owner).toEqual({ kind: "athlete", id: 0 });
    expect(widest).toBeLessThanOrEqual(PITCH.halfWidth - BALL.radius + 1e-9);
  });

  it("frees a shot that went wide off the end boards at once, and calls it wide", () => {
    const state = inPlay();
    clearAround(state);
    state.ball.owner = null;
    state.ball.pos = { x: HL - 4, y: BALL.radius, z: 5 };
    state.ball.vel = { x: 14, y: 0, z: 0 };
    state.flight = { shooter: 0, team: 0, outcome: "wide", t: 0, target: { x: HL, y: 0.3, z: 5 }, keeperX: HL - 1, power: 0.5, resolved: false };
    const events = run(state, 0.6);
    expect(events).toContainEqual({ type: "miss", team: 0, kind: "wide" });
    expect(state.flight.resolved).toBe(true);
    expect(state.phase).toBe("play");
  });

  it("calls a shot over the bar a miss, and a clearance over the boards only a goal kick", () => {
    const shot = inPlay();
    clearAround(shot);
    shot.ball.owner = null;
    shot.ball.pos = { x: HL - 4, y: 2.5, z: 0.5 };
    shot.ball.vel = { x: 18, y: 1, z: 0 };
    shot.flight = { shooter: 0, team: 0, outcome: "over", t: 0, target: { x: HL, y: 3, z: 0.5 }, keeperX: HL - 1, power: 0.5, resolved: false };
    const shotEvents = run(shot, 0.5);
    expect(shotEvents).toContainEqual({ type: "miss", team: 0, kind: "over" });
    expect(shotEvents).toContainEqual({ type: "out", team: 1 });

    const clearance = inPlay();
    clearAround(clearance);
    clearance.ball.owner = null;
    clearance.ball.pos = { x: HL - 4, y: 2.5, z: 7 };
    clearance.ball.vel = { x: 18, y: 1, z: 0 };
    const events = run(clearance, 0.5);
    expect(events).toContainEqual({ type: "out", team: 1 });
    expect(events.some((e) => e.type === "miss")).toBe(false);
  });
});

describe("the keeper", () => {
  it("never carries the ball over its own line after smothering a dribbler", () => {
    let smothered = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const state = createMatch(LINEUP, { seed, replays: false });
      for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
      clearAround(state);
      const me = state.athletes[0]!;
      // Running at the goal line past the keeper, the way a phone's player might.
      me.pos = { x: HL - 3.5, z: (seed % 5) - 2 };
      state.ball.owner = { kind: "athlete", id: 0 };
      for (let t = 0; t < 3 && state.phase === "play"; t += STEP) {
        stepMatch(state, new Map([[0, { move: { x: 1, z: -me.pos.z * 0.1 } }]]));
        if (state.events.some((e) => e.type === "save" && e.kind === "claim")) smothered++;
      }
      expect(state.lastGoal?.scorer === null && state.phase === "goal").toBe(false);
    }
    expect(smothered).toBeGreaterThan(0);
  });
});

describe("a catch with no dive planned", () => {
  it("is held and then played out, never kept by a keeper standing idle", () => {
    const state = inPlay();
    clearAround(state);
    const keeper = state.keepers[1];
    expect(keeper.action).toBe("set");
    makeSave(state, keeper, false);
    const events = run(state, 3);
    expect(events.some((e) => e.type === "throw")).toBe(true);
    expect(state.ball.owner).toBeNull();
  });
});

describe("the keeper's throw", () => {
  it("goes out toward the pitch even with team mates crowding behind the keeper", () => {
    const state = inPlay();
    clearAround(state);
    const keeper = state.keepers[1];
    keeper.pos = { x: HL - 2, z: 0 };
    keeper.facing = Math.PI;
    keeper.action = "hold";
    keeper.holdFor = 0.05;
    state.ball.owner = { kind: "keeper", team: 1 };
    // Blue's players are all between their keeper and their own goal.
    for (const a of state.athletes) if (a.team === 1) a.pos = { x: HL - 0.8, z: a.slot - 1 };
    const events = run(state, 0.3);
    expect(events.some((e) => e.type === "throw")).toBe(true);
    expect(state.ball.vel.x).toBeLessThan(0);
    expect(state.ball.pos.x).toBeLessThan(HL - 2);
  });
});

describe("the final whistle", () => {
  it("clears the losers out of the winners' huddle", () => {
    const state = inPlay();
    state.score = [2, 0];
    fullTime(state);
    // The losers stand right where the winners will gather.
    for (const a of state.athletes) a.pos = a.team === 0 ? { x: a.slot - 1, z: 0 } : { x: 0.3 * a.slot, z: 0.4 };
    run(state, 5);
    const winners = state.athletes.filter((a) => a.team === 0);
    const middle = { x: winners.reduce((s, a) => s + a.pos.x, 0) / 3, z: winners.reduce((s, a) => s + a.pos.z, 0) / 3 };
    for (const a of state.athletes) if (a.team === 1) expect(Math.hypot(a.pos.x - middle.x, a.pos.z - middle.z)).toBeGreaterThan(3);
  });
});
