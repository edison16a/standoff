import { describe, expect, it } from "vitest";
import { GUARD } from "./defence-tuning";
import { goalX } from "./goal";
import { guardSpot, guardStatus, guardTarget } from "./guard";
import { createMatch, stepMatch, type Entrant } from "./match";
import { startPlay } from "./rules";
import type { Command, MatchState } from "./types";
import { dist } from "./vec";

const LINEUP: Entrant[] = [
  { team: 0, character: "echeverri", seat: null },
  { team: 0, character: "brandao", seat: null },
  { team: 0, character: "okemba", seat: null },
  { team: 1, character: "holmvik", seat: 1 },
  { team: 1, character: "lacerda", seat: null },
  { team: 1, character: "serrano", seat: null },
];

/** Red's Striker on the ball, standing still (Training bots do not move), Blue's phone player nearby. */
function setup(): MatchState {
  const state = createMatch(LINEUP, { seed: 2, replays: false, botLevel: "training" });
  startPlay(state);
  const striker = state.athletes[0]!;
  state.ball.owner = { kind: "athlete", id: 0 };
  striker.pos = { x: 4, z: 1 };
  state.athletes[3]!.pos = { x: 8, z: 4 };
  return state;
}

const run = (state: MatchState, command: Command, frames: number) => {
  for (let i = 0; i < frames; i++) stepMatch(state, new Map([[3, command]]));
};

describe("guard", () => {
  it("marks the opponent in the same channel", () => {
    const state = setup();
    expect(guardTarget(state, state.athletes[3]!)?.id).toBe(0);
  });

  it("shadows the man goal side, a set gap off, on its own", () => {
    const state = setup();
    run(state, { move: { x: 0, z: 0 }, guard: true }, 1);
    run(state, { move: { x: 0, z: 0 } }, 150);
    const me = state.athletes[3]!;
    const man = state.athletes[0]!;
    expect(guardStatus(state, me)).toBe("on");
    expect(dist(me.pos, guardSpot(state, me, man))).toBeLessThan(0.4);
    expect(dist(me.pos, man.pos)).toBeCloseTo(GUARD.gapOnBall, 0);
    // Between the man and Blue's goal, on the right (+x) end.
    expect(Math.abs(me.pos.x - goalX(1))).toBeLessThan(Math.abs(man.pos.x - goalX(1)));
  });

  it("does nothing out of range, and gives way to the stick", () => {
    const state = setup();
    state.athletes[3]!.pos = { x: 20, z: -10 };
    run(state, { move: { x: 0, z: 0 }, guard: true }, 1);
    expect(guardStatus(state, state.athletes[3]!)).toBe("far");
    const before = { ...state.athletes[3]!.pos };
    run(state, { move: { x: 0, z: 0 } }, 30);
    expect(dist(before, state.athletes[3]!.pos)).toBeLessThan(0.05);
  });

  it("drops off when Guard is let go", () => {
    const state = setup();
    run(state, { move: { x: 0, z: 0 }, guard: true }, 1);
    run(state, { move: { x: 0, z: 0 }, guard: false }, 1);
    expect(guardStatus(state, state.athletes[3]!)).toBe("off");
  });
});
