import { describe, expect, it } from "vitest";
import { stepLooseBall } from "./loose-ball";
import type { MatchEvent } from "./events";
import { createMatch, stepMatch, type Entrant } from "./match";
import { thinkScale } from "./difficulty";
import { MATCH, STEP } from "./tuning";
import type { MatchState } from "./types";
import { dist } from "./vec";

const LINEUP: Entrant[] = [
  { team: 0, build: "playmaker", seat: 1 },
  { team: 0, build: "striker", seat: null },
  { team: 0, build: "allrounder", seat: null },
  { team: 1, build: "keeper", seat: null },
  { team: 1, build: "winger", seat: null },
  { team: 1, build: "defender", seat: null },
];

function inPlay(level: "easy" | "hard" | "training", seed = 2): MatchState {
  const state = createMatch(LINEUP, { seed, replays: false, level });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  return state;
}

describe("computer difficulty", () => {
  it("leaves the computer players standing still in Training", () => {
    const state = inPlay("training");
    const before = state.athletes.map((a) => ({ ...a.pos }));
    for (let t = 0; t < 3; t += STEP) stepMatch(state);
    state.athletes.slice(1).forEach((a) => expect(dist(a.pos, before[a.id]!)).toBeLessThan(0.05));
  });

  it("thinks slower on Easy than on Hard", () => {
    expect(thinkScale(inPlay("easy"))).toBeGreaterThan(thinkScale(inPlay("hard")));
  });
});

describe("steal", () => {
  it("wins the ball from a dribbler standing still, or gives a foul, or misses", () => {
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const state = inPlay("training", seed);
      const me = state.athletes[0]!;
      const striker = state.athletes[3]!;
      striker.pos = { x: 0, z: 0 };
      striker.facing = 0;
      me.pos = { x: 1, z: 0 };
      state.ball.owner = { kind: "athlete", id: 3 };
      state.ball.pos = { x: 0.46, y: 0.11, z: 0 };
      state.ball.heldFor = 3;
      const events: MatchEvent[] = [];
      for (let t = 0; t < 0.5; t += STEP) {
        stepMatch(state, new Map([[0, { move: { x: 0, z: 0 }, steal: t === 0 }]]));
        events.push(...state.events);
      }
      const steal = events.find((e) => e.type === "steal");
      if (events.some((e) => e.type === "foul")) outcomes.add("foul");
      else if (steal?.type === "steal") outcomes.add(steal.won ? "won" : "lost");
      if (steal?.type === "steal" && steal.won) expect(state.ball.owner).toEqual({ kind: "athlete", id: 0 });
    }
    expect(outcomes.has("won")).toBe(true);
    expect(outcomes.size).toBeGreaterThan(1);
  });
});

describe("blocks", () => {
  it("knocks a shot back off a jumping body instead of stopping it dead, glancing off the curve of him", () => {
    for (const [offset, glance] of [[0.05, false], [0.25, true]] as const) {
      const state = inPlay("training");
      const me = state.athletes[0]!;
      me.pos = { x: 5, z: 0 };
      me.action = "jump";
      me.actionT = 0.3;
      me.actionLen = 0.62;
      state.ball.owner = null;
      state.ball.pos = { x: 5 + 3, y: 1.2, z: offset };
      state.ball.vel = { x: -20, y: 0.6, z: 0 };
      const events: MatchEvent[] = [];
      for (let t = 0; t < 0.2; t += STEP) {
        stepLooseBall(state, STEP);
        events.push(...state.events);
      }
      expect(events.some((e) => e.type === "block")).toBe(true);
      const speed = Math.hypot(state.ball.vel.x, state.ball.vel.z);
      expect(speed).toBeLessThan(12);
      expect(speed).toBeGreaterThan(2);
      // Square on it comes straight back; off the side of him it is turned away sideways.
      if (glance) expect(Math.abs(state.ball.vel.z)).toBeGreaterThan(2);
      else expect(state.ball.vel.x).toBeGreaterThan(0);
      expect(Math.hypot(state.ball.spin.x, state.ball.spin.y, state.ball.spin.z)).toBeGreaterThan(1);
    }
  });
});
