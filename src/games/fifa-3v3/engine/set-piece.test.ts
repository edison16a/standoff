import { describe, expect, it } from "vitest";
import { heldFor } from "./charge";
import { forceFoul } from "./fouls";
import { createMatch, stepMatch, type Entrant } from "./match";
import { startPlay } from "./rules";
import { freeKickLaunch } from "./set-piece-kick";
import { wallBlocks } from "./set-piece-wall";
import type { Command, MatchState } from "./types";

const LINEUP: Entrant[] = [
  { team: 0, character: "echeverri", seat: 1 },
  { team: 0, character: "brandao", seat: null },
  { team: 0, character: "okemba", seat: null },
  { team: 1, character: "holmvik", seat: null },
  { team: 1, character: "lacerda", seat: null },
  { team: 1, character: "serrano", seat: null },
];

/** A match stopped at a set piece for Red, with the phone's player (athlete 0) over the ball. */
function lined(kind: "free" | "penalty", seed = 5, lineup = LINEUP): MatchState {
  const state = createMatch(lineup, { seed, replays: false });
  startPlay(state);
  forceFoul(state, 0, kind);
  for (let i = 0; i < 600 && state.phase !== "setpiece"; i++) stepMatch(state);
  return state;
}

function step(state: MatchState, command: Command, times = 1): void {
  for (let i = 0; i < times; i++) stepMatch(state, new Map([[0, command]]));
}

const STILL = { move: { x: 0, z: 0 } };

describe("free kicks", () => {
  it("turns the aim with the stick and bends the guide line with the curve", () => {
    const state = lined("free");
    const sp = state.setPiece!;
    const straight = sp.path.at(-1)!;
    step(state, { move: { x: 1, z: 0 } }, 30);
    expect(sp.aim).toBeGreaterThan(0.15);
    step(state, { ...STILL, shootUp: true });
    expect(sp.stage).toBe("curve");
    const aimed = sp.path.at(-1)!;
    step(state, { move: { x: 1, z: 0 } }, 30);
    expect(sp.curve).toBeGreaterThan(0.5);
    // Red attacks +x, so the taker's right is +z: the curve bends the end of the line that way.
    expect(sp.path.at(-1)!.z).toBeGreaterThan(aimed.z);
    expect(aimed.z).toBeGreaterThan(straight.z);
  });

  it("goes back a stage on Slide, and strikes once the power is let go", () => {
    const state = lined("free");
    const sp = state.setPiece!;
    step(state, { ...STILL, shootUp: true });
    step(state, { ...STILL, slide: true });
    expect(sp.stage).toBe("aim");
    step(state, { ...STILL, shootUp: true });
    step(state, { ...STILL, shootUp: true });
    expect(sp.stage).toBe("power");
    step(state, { ...STILL, shootDown: true });
    step(state, STILL, 20);
    step(state, { ...STILL, shootUp: true, held: heldFor(0.6) });
    expect(sp.stage).toBe("runup");
    expect(sp.power).toBeCloseTo(0.6, 1);
    const wall = [...sp.wall];
    for (let i = 0; i < 120 && state.phase === "setpiece"; i++) step(state, STILL);
    expect(state.phase).toBe("play");
    expect(state.setPiece).toBeNull();
    expect(Math.hypot(state.ball.vel.x, state.ball.vel.z)).toBeGreaterThan(10);
    // The wall jumps as the kick is struck.
    for (const id of wall) expect(state.athletes[id]!.action).toBe("jump");
  });

  it("is blocked by the wall when struck straight at it, and clears it aimed round", () => {
    const state = lined("free");
    const sp = state.setPiece!;
    expect(wallBlocks(state, sp, freeKickLaunch(sp, 0.55))).toBe(true);
    const round = { ...sp, aim: 0.45 };
    expect(wallBlocks(state, round, freeKickLaunch(round, 0.55))).toBe(false);
  });

  it("is taken by a computer when the side has no phone", () => {
    const bots = LINEUP.map((e) => ({ ...e, seat: null }));
    const state = lined("free", 7, bots);
    expect(state.phase).toBe("setpiece");
    for (let i = 0; i < 300 && state.phase === "setpiece"; i++) stepMatch(state);
    expect(state.phase).toBe("play");
  });
});

describe("penalties", () => {
  it("moves the spot on the goal with the stick, then shoots at it", () => {
    const state = lined("penalty");
    const sp = state.setPiece!;
    step(state, { move: { x: 1, z: -1 } }, 30);
    expect(sp.target.z).toBeGreaterThan(0.8);
    expect(sp.target.y).toBeGreaterThan(1.2);
    step(state, { ...STILL, shootUp: true });
    expect(sp.stage).toBe("power");
    step(state, { ...STILL, shootDown: true });
    step(state, { ...STILL, shootUp: true, held: heldFor(0.5) });
    for (let i = 0; i < 120 && state.phase === "setpiece"; i++) step(state, STILL);
    expect(state.flight).not.toBeNull();
  });

  it("goes in most of the time from computer takers, but not always", () => {
    const bots = LINEUP.map((e) => ({ ...e, seat: null }));
    let goals = 0;
    const tries = 24;
    for (let seed = 1; seed <= tries; seed++) {
      const state = lined("penalty", seed, bots);
      for (let i = 0; i < 400 && state.phase !== "goal" && !(state.flight?.resolved ?? false); i++) stepMatch(state);
      if (state.score[0] > 0) goals++;
    }
    expect(goals).toBeGreaterThan(tries * 0.45);
    expect(goals).toBeLessThan(tries);
  });
});
