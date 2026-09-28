import { describe, expect, it } from "vitest";
import { makeAthlete } from "./athlete";
import { newBall, stepBall } from "./ball";
import { KNEE_SLIDE, stepCelebration } from "./celebrate-moves";
import { makeSave } from "./keeper";
import { createMatch, stepMatch, type Entrant } from "./match";
import { startShot } from "./kick";
import { BALL, MATCH, PITCH, STEP } from "./tuning";
import type { MatchState } from "./types";

const HL = PITCH.halfLength;
const LINEUP: Entrant[] = [
  { team: 0, character: "echeverri", seat: 1 },
  { team: 0, character: "brandao", seat: null },
  { team: 0, character: "okemba", seat: null },
  { team: 1, character: "holmvik", seat: null },
  { team: 1, character: "lacerda", seat: null },
  { team: 1, character: "serrano", seat: null },
];

/** A match in play with the computer players standing still, so a scene can be set by hand. */
function still(seed: number): MatchState {
  const state = createMatch(LINEUP, { seed, replays: false, level: "training" });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  return state;
}

describe("a parry", () => {
  it("comes off the gloves back into the field, slower, and stays out of the goal", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const state = still(seed);
      const k = state.keepers[1];
      state.ball.owner = null;
      state.ball.pos = { x: k.pos.x, y: 1.3, z: k.pos.z + 0.8 };
      state.ball.vel = { x: 26, y: 0.5, z: 1.5 };
      makeSave(state, k, true);
      expect(state.ball.vel.x).toBeLessThan(0);
      expect(Math.hypot(state.ball.vel.x, state.ball.vel.y, state.ball.vel.z)).toBeLessThan(20);
      for (let t = 0; t < 1.2; t += STEP) stepBall(state.ball, STEP);
      expect(state.ball.pos.x).toBeLessThan(HL);
    }
  });
});

describe("a bounce", () => {
  /** Drops a ball moving forward with some spin and returns its pace along the ground after the first bounce. */
  function afterBounce(spinZ: number): number {
    const ball = newBall();
    ball.pos = { x: 0, y: 1, z: 0 };
    ball.vel = { x: 10, y: 0, z: 0 };
    ball.spin = { x: 0, y: 0, z: spinZ };
    for (let t = 0; t < 0.6; t += STEP) stepBall(ball, STEP, [], { flightOnly: true });
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
    const a = makeAthlete(0, 0, 0, "echeverri", null);
    a.pos = { x: 10, z: 8 };
    a.vel = { x: 0, z: 7.5 };
    a.facing = Math.PI / 2;
    for (let t = 0; t < KNEE_SLIDE.length; t += STEP) stepCelebration(a, "kneeslide", t, STEP);
    expect(a.pos.z - 8).toBeGreaterThan(3);
    expect(Math.hypot(a.vel.x, a.vel.z)).toBeLessThan(0.01);
    expect(a.pos.z).toBeLessThan(PITCH.halfWidth - 1);
  });
});
