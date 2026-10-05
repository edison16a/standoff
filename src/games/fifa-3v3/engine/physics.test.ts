import { describe, expect, it } from "vitest";
import { makeAthlete } from "./athlete";
import { newBall, stepBall, type Contact } from "./ball";
import { KNEE_SLIDE, stepCelebration } from "./celebrate-moves";
import type { MatchEvent } from "./events";
import { stepLooseBall } from "./loose-ball";
import { diveTo, planDive } from "./keeper-read";
import { fly } from "./shot-aim";
import { createMatch, stepMatch, type Entrant } from "./match";
import { startShot } from "./kick";
import { BALL, MATCH, PITCH, STEP } from "./tuning";
import type { MatchState } from "./types";

const HL = PITCH.halfLength;
const LINEUP: Entrant[] = [
  { team: 0, build: "playmaker", seat: 1 },
  { team: 0, build: "striker", seat: null },
  { team: 0, build: "allrounder", seat: null },
  { team: 1, build: "keeper", seat: null },
  { team: 1, build: "winger", seat: null },
  { team: 1, build: "defender", seat: null },
];

/** A match in play with the computer players standing still, so a scene can be set by hand. */
function still(seed: number): MatchState {
  const state = createMatch(LINEUP, { seed, replays: false, level: "training" });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  return state;
}

describe("a parry", () => {
  /** A shot by Red flying at Blue's goal from `from`. */
  function flying(state: MatchState, from: { x: number; y: number; z: number }, vel: { x: number; y: number; z: number }): void {
    state.ball.owner = null;
    state.ball.pos = { ...from };
    state.ball.vel = { ...vel };
    state.ball.spin = { x: 0, y: 0, z: 0 };
    state.flight = { shooter: 0, team: 0, outcome: null, t: 0, target: { x: HL, y: 1, z: 2 }, keeperX: HL - 1.2, power: 0.8, resolved: false };
  }

  it("comes off the palms back into the field, slower, when the ball is too hot to hold", () => {
    for (const height of [0.7, 1.4, 2.2]) {
      const state = still(1);
      const k = state.keepers[1];
      k.pos = { x: HL - 1.2, z: 0 };
      flying(state, { x: HL - 9, y: height, z: 2.2 }, { x: 27, y: 1.4, z: 0 });
      // The gloves meet the ball's line at full stretch, just as it gets there: a palm, never a catch.
      const hit = fly({ ...state.ball.pos }, { vel: { ...state.ball.vel }, spin: { x: 0, y: 0, z: 0 }, time: 0 }, k.pos.x)!;
      diveTo(k, hit.z, hit.y, 0, hit.t, 0);
      const events: MatchEvent[] = [];
      for (let t = 0; t < 0.45; t += STEP) {
        stepLooseBall(state, STEP);
        k.actionT += STEP;
        events.push(...state.events);
        state.events = [];
      }
      expect(events.some((e) => e.type === "save" && e.kind === "parry")).toBe(true);
      expect(state.ball.vel.x).toBeLessThan(0);
      expect(Math.hypot(state.ball.vel.x, state.ball.vel.y, state.ball.vel.z)).toBeLessThan(15);
    }
  });

  it("is held instead when it comes at the keeper gently", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const state = still(seed);
      const k = state.keepers[1];
      k.pos = { x: HL - 1.2, z: 0 };
      flying(state, { x: HL - 8, y: 0.9, z: 0.2 }, { x: 13, y: 2, z: 0 });
      planDive(state, k);
      for (let t = 0; t < 0.8 && state.ball.owner === null; t += STEP) {
        stepLooseBall(state, STEP);
        k.actionT += STEP;
      }
      expect(state.ball.owner).toEqual({ kind: "keeper", team: 1 });
    }
  });
});

describe("a bounce", () => {
  /** Drops a ball moving forward with some spin and returns its pace along the ground just after the first bounce. */
  function afterBounce(spinZ: number): number {
    const ball = newBall();
    ball.pos = { x: 0, y: BALL.radius + 0.02, z: 0 };
    ball.vel = { x: 10, y: -4, z: 0 };
    ball.spin = { x: 0, y: 0, z: spinZ };
    const contacts: Contact[] = [];
    for (let t = 0; t < 0.2 && contacts.length === 0; t += STEP) stepBall(ball, STEP, contacts, { flightOnly: true });
    return ball.vel.x;
  }

  it("kicks on with topspin and checks with backspin", () => {
    // Moving along +x, topspin turns about -z.
    const top = afterBounce(-60);
    const back = afterBounce(60);
    expect(top).toBeGreaterThan(back + 1);
  });

  it("turns a skidding ball toward a roll", () => {
    const ball = newBall();
    ball.pos = { x: 0, y: 0.6, z: 0 };
    ball.vel = { x: 8, y: 0, z: 0 };
    for (let t = 0; t < 0.4; t += STEP) stepBall(ball, STEP, [], { flightOnly: true });
    // Rolling forward along +x spins about -z.
    expect(ball.spin.z).toBeLessThan(0);
  });
});

describe("a shot into a crowd", () => {
  it("is sometimes charged down by a defender in the lane, and flies off the body", () => {
    let blocked = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const state = still(seed);
      const me = state.athletes[0]!;
      const defender = state.athletes[3]!;
      state.athletes.forEach((a, i) => {
        if (i !== 0 && i !== 3) a.pos = { x: -10, z: -10 + i * 3 };
      });
      me.pos = { x: HL - 15, z: 0.5 };
      me.facing = 0;
      defender.pos = { x: HL - 11, z: 0.4 };
      state.ball.owner = { kind: "athlete", id: 0 };
      state.ball.pos = { x: me.pos.x + 0.4, y: BALL.radius, z: 0.5 };
      startShot(state, me, 0.5);
      let block = false;
      for (let t = 0; t < 1.2 && state.phase === "play"; t += STEP) {
        stepMatch(state);
        if (state.events.some((e) => e.type === "block")) block = true;
      }
      if (!block) continue;
      blocked++;
      expect(defender.stats.blocks).toBe(1);
      // Off the body it has lost most of its pace and is not in the goal.
      expect(state.score[0]).toBe(0);
    }
    expect(blocked).toBeGreaterThan(4);
    expect(blocked).toBeLessThan(24);
  });
});

describe("the knee slide", () => {
  it("slides across the grass, slows to a stop, and stays inside the boards", () => {
    const a = makeAthlete(0, 0, 0, "playmaker", null);
    a.pos = { x: 10, z: 8 };
    a.vel = { x: 0, z: 7.5 };
    a.facing = Math.PI / 2;
    for (let t = 0; t < KNEE_SLIDE.length; t += STEP) stepCelebration(a, "kneeslide", t, STEP);
    expect(a.pos.z - 8).toBeGreaterThan(3);
    expect(Math.hypot(a.vel.x, a.vel.z)).toBeLessThan(0.01);
    expect(a.pos.z).toBeLessThan(PITCH.halfWidth - 1);
  });
});
