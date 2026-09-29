import { describe, expect, it } from "vitest";
import type { MatchEvent } from "./events";
import { createMatch, stepMatch, type Entrant } from "./match";
import { setupSetPiece } from "./set-piece";
import { freeKick, kickPath, SET_KICK, spotBall } from "./set-piece-kick";
import { fly } from "./shot-aim";
import { MATCH, PITCH, STEP } from "./tuning";
import type { Command, MatchState, SetPiece } from "./types";

const LINEUP: Entrant[] = [
  { team: 0, build: "playmaker", seat: 1 },
  { team: 0, build: "striker", seat: null },
  { team: 0, build: "allrounder", seat: null },
  { team: 1, build: "keeper", seat: null },
  { team: 1, build: "winger", seat: null },
  { team: 1, build: "defender", seat: null },
];

/** A set piece for Red, whose first player is a phone, fouled at a spot. */
function setPiece(kind: "free" | "penalty", at = { x: PITCH.halfLength - 18, z: 2 }): MatchState {
  const state = createMatch(LINEUP, { seed: 8, replays: false });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  state.foul = { by: 3, victim: 0, at, kind: "admin", penalty: kind === "penalty", team: 0, carded: true };
  setupSetPiece(state);
  return state;
}

function send(state: MatchState, command: Command, seconds = STEP): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (let t = 0; t < seconds - 1e-9; t += STEP) {
    stepMatch(state, new Map([[0, command]]));
    events.push(...state.events);
  }
  return events;
}

const still = { move: { x: 0, z: 0 } };
const tap = (state: MatchState) => {
  send(state, { ...still, shootDown: true });
  send(state, { ...still, shootUp: true });
};

describe("free kick", () => {
  it("is taken by the phone's player, in stages: aim, curve, then power", () => {
    const state = setPiece("free");
    const sp = state.setPiece!;
    expect(sp.taker).toBe(0);
    expect(sp.stage).toBe("aim");
    send(state, { move: { x: 1, z: 0 } }, 0.5);
    expect(sp.aimX).toBeGreaterThan(0.15);
    tap(state);
    expect(sp.stage).toBe("curve");
    send(state, { move: { x: -1, z: 0 } }, 0.4);
    expect(sp.curve).toBeLessThan(-0.4);
    tap(state);
    expect(sp.stage).toBe("power");
    send(state, { ...still, shootDown: true });
    send(state, still, 0.6);
    expect(sp.power).toBeGreaterThan(0.3);
    const events = send(state, { ...still, shootUp: true }, 1.2);
    expect(events.some((e) => e.type === "shot" && e.athlete === 0)).toBe(true);
    expect(events.some((e) => e.type === "wallJump")).toBe(true);
  });

  it("bends the way the curve is set", () => {
    const state = setPiece("free", { x: PITCH.halfLength - 18, z: 0 });
    const sp = state.setPiece!;
    const cross = (curve: number) => fly(spotBall(sp), freeKick({ ...sp, curve }, SET_KICK.nominal), PITCH.halfLength)!.z;
    // Red attacks toward +x, so the taker's right is +z.
    expect(cross(1)).toBeGreaterThan(cross(0) + 1);
    expect(cross(-1)).toBeLessThan(cross(0) - 1);
  });

  it("dips under the bar at the nominal power and climbs with more", () => {
    const sp: SetPiece = setPiece("free", { x: PITCH.halfLength - 18, z: 0 }).setPiece!;
    const height = (power: number) => fly(spotBall(sp), freeKick(sp, power), PITCH.halfLength)!.y;
    expect(height(SET_KICK.nominal)).toBeCloseTo(SET_KICK.crossHeight, 1);
    expect(height(1)).toBeGreaterThan(PITCH.goalHeight);
    expect(height(0.3)).toBeLessThan(height(SET_KICK.nominal));
  });

  it("keeps all of yellow under the bar from any range, and only red flies over", () => {
    const under = PITCH.goalHeight - 0.15;
    for (const back of [10, 18, 26]) {
      const sp: SetPiece = setPiece("free", { x: PITCH.halfLength - back, z: 3 }).setPiece!;
      const height = (power: number) => fly(spotBall(sp), freeKick(sp, power), PITCH.halfLength)!.y;
      expect(height(0.75)).toBeLessThan(under);
      expect(height(0.98)).toBeGreaterThan(PITCH.goalHeight + 0.2);
    }
  });

  it("stands the taker off to the side of his kicking foot, so the run comes in at an angle", () => {
    const state = setPiece("free", { x: PITCH.halfLength - 18, z: 0 });
    const taker = state.athletes[state.setPiece!.taker]!;
    // The Playmaker is left footed and Red attacks +x, so his right is +z.
    expect(taker.pos.x).toBeLessThan(state.setPiece!.spot.x - 1.5);
    expect(taker.pos.z).toBeGreaterThan(0.8);
  });

  it("draws a line from the ball to the goal", () => {
    const sp = setPiece("free").setPiece!;
    const path = kickPath(sp);
    expect(path.length).toBeGreaterThan(10);
    expect(path[0]!.x).toBeCloseTo(sp.spot.x, 5);
    expect(path[path.length - 1]!.x).toBeGreaterThan(PITCH.halfLength - 0.5);
    expect(Math.max(...path.map((p) => p.y))).toBeGreaterThan(1.9);
  });

  it("is taken by a computer player on its own", () => {
    const state = setPiece("free");
    const sp = state.setPiece!;
    state.athletes[0]!.online = false;
    const events: MatchEvent[] = [];
    for (let t = 0; t < 8 && state.phase === "setpiece"; t += STEP) {
      stepMatch(state);
      events.push(...state.events);
    }
    expect(state.phase).toBe("play");
    expect(sp.launched).toBe(true);
    expect(events.some((e) => e.type === "shot")).toBe(true);
  });
});

describe("penalty", () => {
  it("aims across and up, then shoots on the power", () => {
    const state = setPiece("penalty");
    const sp = state.setPiece!;
    expect(sp.kind).toBe("penalty");
    send(state, { move: { x: -1, z: -1 } }, 0.4);
    expect(sp.aimX).toBeLessThan(-0.8);
    expect(sp.aimY).toBeGreaterThan(1.3);
    tap(state);
    expect(sp.stage).toBe("power");
    send(state, { ...still, shootDown: true });
    send(state, still, 0.4);
    const events = send(state, { ...still, shootUp: true }, 1);
    const shot = events.find((e) => e.type === "shot");
    expect(shot).toBeDefined();
    // The keeper went one way or stood; either way he is not still set.
    expect(state.keepers[1].action === "dive" || state.keepers[1].action === "set" || state.keepers[1].action === "catch").toBe(true);
  });
});
