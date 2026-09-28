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
  const off = lerp(0.9, 2.3, clamp01(1 - (d - 4) / 18));
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
  // A shot charged down by a defender never reaches the keeper, so he stays on his feet.
  if (!flight || flight.team === k.team || k.action !== "set" || (flight.blocker ?? null) !== null) return;
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
    parryOffGloves(state, k);
    k.noTouch = 1.1;
  } else {
    ball.owner = { kind: "keeper", team: k.team };
    ball.vel = { x: 0, y: 0, z: 0 };
    ball.heldFor = 0;
    k.holdFor = state.rng.range(KEEPER.holdMin, KEEPER.holdMax);
    // Not mid dive (a shot too quick to plan one for): the ball is simply taken in the arms.
    if (k.dive?.standing || k.action !== "dive") {
      k.action = "catch";
      k.actionT = 0;
    }
  }
  state.events.push({ type: "save", team: k.team, kind: parry ? "parry" : "catch", at });
}

/**
 * A parry is a real bounce off the gloves. The palms face out of the
 * goal, tilted toward the side of the dive and up for a high ball, so
 * the ball's motion into them is reflected with a soft glove's give,
 * the part along them is dragged, and the wrists add a push. It always
 * leaves back into the field, away from the goal.
 */
export function parryOffGloves(state: MatchState, k: Keeper): void {
  const ball = state.ball;
  const r = state.rng;
  const out = outward(k.team);
  const side = k.dive?.dir ?? r.sign();
  const high = clamp01((ball.pos.y - 1.2) / 1.2);
  // The palm's normal: mostly out of the goal, leaning to the dive side, and up over a high ball.
  let nx = out * 0.85;
  let ny = 0.15 + 0.45 * high;
  let nz = side * r.range(0.3, 0.6);
  const n = Math.hypot(nx, ny, nz);
  nx /= n;
  ny /= n;
  nz /= n;
  const v = ball.vel;
  const into = v.x * nx + v.y * ny + v.z * nz;
  const give = 0.42;
  const push = r.range(2, 3.5);
  const bounce = into < 0 ? (1 + give) * into : 0;
  let vx = (v.x - bounce * nx) * 0.55 + nx * push;
  const vy = (v.y - bounce * ny) * 0.55 + ny * push;
  const vz = (v.z - bounce * nz) * 0.55 + nz * push;
  // A glancing touch can still carry on toward the goal; a keeper's palm never lets that happen.
  if (vx * out < 2) vx = out * r.range(2, 3.5);
  ball.vel = { x: vx, y: Math.max(0.6, vy), z: vz };
  // The ball comes off the gloves spinning the way it rolled across them.
  ball.spin = { x: r.range(-6, 6), y: -side * r.range(4, 10), z: r.range(-6, 6) };
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
