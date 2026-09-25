import type { TeamId } from "../teams";
import { goalX } from "./goal";
import { diveLayout } from "./dive";
import { fly } from "./shot-aim";
import { KEEPER, PITCH } from "./tuning";
import type { Dive, Keeper, MatchState } from "./types";
import { clamp, clamp01, lerp, v2, type Vec2 } from "./vec";

export function makeKeeper(team: TeamId): Keeper {
  const x = goalX(team) + (team === 0 ? 1 : -1);
  return { team, pos: v2(x, 0), vel: v2(), facing: team === 0 ? 0 : Math.PI, action: "set", actionT: 0, dive: null, holdFor: 0, noTouch: 0, saves: 0 };
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
  const off = lerp(0.9, 2.1, clamp01(1 - (d - 4) / 14));
  const ux = d > 0.01 ? dx / d : outward(k.team);
  const uz = d > 0.01 ? b.z / d : 0;
  const x = gx + Math.max(0.6, Math.abs(ux * off)) * outward(k.team);
  return { x, z: clamp(uz * off * 1.2, -(PITCH.goalHalfWidth - 0.35), PITCH.goalHalfWidth - 0.35) };
}

/**
 * Reads a shot at this keeper's goal and plans the dive. For a save the
 * gloves meet the ball exactly where it crosses the keeper's line. For
 * a goal the dive is a fingertip short, or now and then the wrong way.
 */
export function planDive(state: MatchState, k: Keeper): void {
  const flight = state.flight;
  const ball = state.ball;
  if (!flight || flight.team === k.team || k.action !== "set") return;
  const hit = fly({ ...ball.pos }, { vel: { ...ball.vel }, spin: { ...ball.spin }, time: 0 }, k.pos.x);
  if (!hit) return;
  const dz = hit.z - k.pos.z;
  let dir: 1 | -1 = dz >= 0 ? 1 : -1;
  let gloveZ = hit.z;
  let height = clamp(hit.y, 0.15, 2.4);
  const save = flight.outcome === "catch" || flight.outcome === "parry";
  if (!save) {
    if (flight.outcome === "over") height = Math.min(2.5, hit.y);
    else if (flight.outcome === "goal" && Math.abs(dz) > 1 && state.rng.chance(0.15)) {
      dir = dir === 1 ? -1 : 1;
      gloveZ = k.pos.z + dir * state.rng.range(0.6, 1.2);
    } else gloveZ = hit.z - dir * state.rng.range(0.35, 0.75);
  }
  const lateral = Math.abs(gloveZ - k.pos.z);
  const standing = save && lateral < 0.55 && hit.y < 1.75;
  const feet = standing ? lateral : diveLayout({ fromZ: k.pos.z, gloveZ, height }).feet;
  const duration = clamp(Math.min(KEEPER.diveTime, hit.t), 0.12, KEEPER.diveTime);
  const dive: Dive = { dir, fromZ: k.pos.z, toZ: k.pos.z + dir * feet, gloveZ, height, wait: Math.max(0, hit.t - duration), duration, standing };
  k.dive = dive;
  k.action = "dive";
  k.actionT = 0;
}

/** Called when a shot meant to be saved reaches the gloves. */
export function makeSave(state: MatchState, k: Keeper, parry: boolean): void {
  const ball = state.ball;
  k.saves++;
  const at = { ...ball.pos };
  ball.lastTouch = { team: k.team, id: null };
  ball.spin = { x: 0, y: 0, z: 0 };
  if (parry) {
    const side = k.dive?.dir ?? state.rng.sign();
    // Pushed away from goal and out to the side the keeper dived to.
    ball.vel = { x: outward(k.team) * state.rng.range(3, 6.5), y: state.rng.range(1.5, 4), z: side * state.rng.range(3, 7) };
    k.noTouch = 1.1;
  } else {
    ball.owner = { kind: "keeper", team: k.team };
    ball.vel = { x: 0, y: 0, z: 0 };
    ball.heldFor = 0;
    k.holdFor = state.rng.range(KEEPER.holdMin, KEEPER.holdMax);
    if (k.dive?.standing) {
      k.action = "catch";
      k.actionT = 0;
    }
  }
  state.events.push({ type: "save", team: k.team, kind: parry ? "parry" : "catch", at });
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
  return { x: k.pos.x + Math.cos(k.facing) * 0.32, y: 1.05, z: k.pos.z + Math.sin(k.facing) * 0.32 };
}
