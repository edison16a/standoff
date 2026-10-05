import { other } from "../teams";
import { shotAimZ } from "./assist";
import { isHuman } from "./athlete";
import { ballSpeed } from "./ball";
import { chargeLevel, isTap } from "./charge";
import { JUMP, jumpHeight } from "./defend";
import { goalX, toGoal } from "./goal";
import { headerAt, volley } from "./head-ball";
import { AERIAL, ready } from "./reach";
import { BALL } from "./tuning";
import type { Athlete, MatchState } from "./types";

/**
 * The ball in the air near a player: taken on the chest, headed, or hit
 * on the volley. A ball dropping between the knees and the chest is
 * brought down; one at head height is headed, at goal near it, clear
 * near his own goal, and on to a team mate elsewhere; one he jumps for
 * is met at the top of his leap. A ball at volley height to a player who
 * pressed to shoot is struck as it is, which is hard to keep down.
 */
export const AIR_PLAY = {
  /** A leap starts when the ball will pass over him this soon, so the top of it meets the ball. */
  leapFrom: 0.24,
  leapTo: 0.36,
  /** Heights a leap is needed for: above a standing header, below the top of a leap. */
  leapLow: 1.95,
  /** The head's reach: its own size, the ball's, and a little stretch of the neck. */
  head: 0.14 + BALL.radius + 0.12,
  /** Inside this distance of the goal he attacks a header is a shot, and a computer player volleys. */
  headAtGoal: 13,
  volleyAtGoal: 16,
} as const;

/** Where a player's head is, lifted by a leap. */
export function headOf(a: Athlete): { x: number; y: number; z: number } {
  return { x: a.pos.x + Math.cos(a.facing) * 0.06, y: 1.7 + jumpHeight(a), z: a.pos.z + Math.sin(a.facing) * 0.06 };
}

/** Starts a leap for a ball that will come over a player's head at the top of his reach. */
export function rise(state: MatchState): void {
  const ball = state.ball;
  if (ball.owner || ball.pos.y < 1) return;
  for (const a of state.athletes) {
    if (a.action !== "free" || !ready(state, a)) continue;
    // When the ball passes nearest, and how high it is then, by its flight.
    const dx = ball.pos.x - a.pos.x;
    const dz = ball.pos.z - a.pos.z;
    const v2 = ball.vel.x * ball.vel.x + ball.vel.z * ball.vel.z;
    const t = v2 > 1e-6 ? -(dx * ball.vel.x + dz * ball.vel.z) / v2 : 0;
    if (t < AIR_PLAY.leapFrom || t > AIR_PLAY.leapTo) continue;
    const miss = Math.hypot(dx + ball.vel.x * t, dz + ball.vel.z * t);
    const y = ball.pos.y + ball.vel.y * t - 0.5 * BALL.gravity * t * t;
    if (miss > AERIAL.reach || y < AIR_PLAY.leapLow || y > AERIAL.top) continue;
    a.action = "header";
    a.actionT = 0;
    a.actionLen = JUMP.length;
    a.facing = Math.atan2(-ball.vel.z, -ball.vel.x);
  }
}

/** The ball in the air at a ready player's chest, head or volleying boot. Returns true when someone played it. */
export function tryAerial(state: MatchState): boolean {
  const ball = state.ball;
  const shotLive = state.flight !== null && !state.flight.resolved;
  if (ball.owner || shotLive || ball.inGoal !== null || ball.pos.y < 0.25 || ball.pos.y > AERIAL.top + 0.2) return false;
  let best: Athlete | null = null;
  let bestD = Infinity;
  for (const a of state.athletes) {
    if ((a.action !== "free" && a.action !== "header") || !ready(state, a)) continue;
    const d = Math.hypot(ball.pos.x - a.pos.x, ball.pos.z - a.pos.z);
    if (d > AERIAL.reach + 0.25 || d >= bestD) continue;
    best = a;
    bestD = d;
  }
  if (!best) return false;
  const a = best;
  const y = ball.pos.y;
  const volleying = wantsVolley(state, a);
  if (y < AERIAL.chest) return bestD < 0.75 && volleying ? volleyNow(state, a) : false;
  // Too hard to kill, it hits him (blockers.ts); lining up a volley, he lets it drop.
  if (y < AERIAL.head) return a.action === "free" && !volleying && ballSpeed(ball) < AERIAL.chestMax ? chest(state, a) : false;
  const head = headOf(a);
  if (Math.hypot(ball.pos.x - head.x, y - head.y, ball.pos.z - head.z) > AIR_PLAY.head) return false;
  const tapped = a.buffered > 0 && isTap(a.bufferHeld);
  headerAt(state, a, !tapped && toGoal(a.pos, other(a.team)) < AIR_PLAY.headAtGoal);
  return true;
}

/** A phone's player who pressed to shoot as it dropped; a computer player in range, facing the goal, with it dropping. */
function wantsVolley(state: MatchState, a: Athlete): boolean {
  if (isHuman(a)) return a.buffered > 0 && !isTap(a.bufferHeld);
  const foe = other(a.team);
  const facing = Math.cos(a.facing) * Math.sign(goalX(foe) - a.pos.x) > 0.3;
  return state.ball.vel.y < 0 && facing && toGoal(a.pos, foe) < AIR_PLAY.volleyAtGoal;
}

function volleyNow(state: MatchState, a: Athlete): boolean {
  if (!isHuman(a)) return volley(state, a, 0.7, null);
  return volley(state, a, chargeLevel(a.bufferHeld), a.bufferAim ? shotAimZ(a, a.bufferAim) : null);
}

/** Brought down on the chest: the pace killed, the ball dropping at his feet, his to play. */
function chest(state: MatchState, a: Athlete): boolean {
  const ball = state.ball;
  const from = ball.lastTouch?.team ?? null;
  ball.vel = { x: a.vel.x * 0.85 + ball.vel.x * 0.08, y: -0.6, z: a.vel.z * 0.85 + ball.vel.z * 0.08 };
  ball.spin = { x: 0, y: 0, z: 0 };
  ball.owner = { kind: "athlete", id: a.id };
  ball.lastTouch = { team: a.team, id: a.id };
  ball.passTo = null;
  ball.heldFor = 0;
  a.action = "chest";
  a.actionT = 0;
  a.actionLen = 0.32;
  state.events.push({ type: "control", athlete: a.id, team: a.team, from });
  return true;
}
