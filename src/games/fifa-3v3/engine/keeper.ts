import type { TeamId } from "../teams";
import { goalX } from "./goal";
import { KEEPER, PITCH } from "./tuning";
import type { Keeper, MatchState } from "./types";
import { clamp, clamp01, lerp, v2, type Vec2 } from "./vec";

export function makeKeeper(team: TeamId): Keeper {
  const x = goalX(team) + (team === 0 ? 1 : -1);
  return { team, pos: v2(x, 0), vel: v2(), facing: team === 0 ? 0 : Math.PI, action: "set", actionT: 0, dive: null, holdFor: 0, noTouch: 0, saves: 0, grip: 0 };
}

/** Which way is out of the goal, along x. */
export function outward(team: TeamId): 1 | -1 {
  return team === 0 ? 1 : -1;
}

/**
 * Where a keeper wants to stand: on the line from the ball to the middle
 * of the goal, coming further off the line as the ball comes closer to
 * narrow the angle, and never wider than the posts.
 */
export function keeperHome(state: MatchState, k: Keeper): Vec2 {
  const gx = goalX(k.team);
  const b = state.ball.pos;
  const dx = b.x - gx;
  const d = Math.hypot(dx, b.z);
  const off = lerp(0.9, 2.3, clamp01(1 - (d - 4) / 18));
  const ux = d > 0.01 ? dx / d : outward(k.team);
  const uz = d > 0.01 ? b.z / d : 0;
  const x = gx + Math.max(0.6, Math.abs(ux * off)) * outward(k.team);
  return { x, z: clamp(uz * off * 1.2, -(PITCH.goalHalfWidth - 0.35), PITCH.goalHalfWidth - 0.35) };
}

/**
 * The ball held in the gloves: a catch off a shot, made in the flight
 * by the ball meeting his palms slowly enough (keeper-body.ts). A dive
 * that ends holding it comes down with it; standing, he gathers it in.
 */
export function makeSave(state: MatchState, k: Keeper): void {
  const ball = state.ball;
  k.saves++;
  const at = { ...ball.pos };
  ball.lastTouch = { team: k.team, id: null };
  ball.spin = { x: 0, y: 0, z: 0 };
  ball.owner = { kind: "keeper", team: k.team };
  ball.vel = { x: 0, y: 0, z: 0 };
  ball.heldFor = 0;
  ball.passTo = null;
  k.holdFor = state.rng.range(KEEPER.holdMin, KEEPER.holdMax);
  // Not mid dive (a shot too quick to plan one for): the ball is simply taken in the arms.
  if (k.dive?.standing || k.action !== "dive") {
    k.action = "catch";
    k.actionT = 0;
  }
  const flight = state.flight;
  if (flight && !flight.resolved) {
    flight.resolved = true;
    flight.outcome = "catch";
  }
  state.events.push({ type: "save", team: k.team, kind: "catch", at });
}

/** A shot palmed or blocked by the keeper: he counts the save once, and leaves the ball a moment to get clear. */
export function palmSave(state: MatchState, k: Keeper): void {
  const ball = state.ball;
  ball.lastTouch = { team: k.team, id: null };
  ball.passTo = null;
  k.noTouch = Math.max(k.noTouch, 0.6);
  const flight = state.flight;
  if (!flight || flight.resolved || flight.team === k.team) return;
  k.saves++;
  flight.resolved = true;
  flight.outcome = "parry";
  state.events.push({ type: "save", team: k.team, kind: "parry", at: { ...ball.pos } });
}

/** A loose ball in the box, gathered up: the keeper holds it and plays it out. */
export function claim(state: MatchState, k: Keeper): void {
  const ball = state.ball;
  ball.owner = { kind: "keeper", team: k.team };
  ball.vel = { x: 0, y: 0, z: 0 };
  ball.spin = { x: 0, y: 0, z: 0 };
  ball.lastTouch = { team: k.team, id: null };
  ball.passTo = null;
  ball.heldFor = 0;
  k.action = "catch";
  k.actionT = 0;
  k.dive = null;
  k.holdFor = state.rng.range(KEEPER.holdMin, KEEPER.holdMax);
  state.events.push({ type: "save", team: k.team, kind: "claim", at: { ...ball.pos } });
}

/** Where the gloves hold the ball, chest high in front of the keeper. */
export function hands(k: Keeper): { x: number; y: number; z: number } {
  // Kept on the pitch side of the line even when the keeper turns to face the goal.
  const gx = goalX(k.team);
  const x = k.pos.x + Math.cos(k.facing) * 0.32;
  const inside = (x - gx) * outward(k.team) < 0.2 ? gx + outward(k.team) * 0.2 : x;
  return { x: inside, y: 1.05, z: k.pos.z + Math.sin(k.facing) * 0.32 };
}
