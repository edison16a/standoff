import { diveLayout } from "./dive";
import { goalX } from "./goal";
import { planDive } from "./keeper";
import { fly, type Kick } from "./shot-aim";
import { BALL, KEEPER, PITCH } from "./tuning";
import type { Keeper, MatchState, SetPiece, ShotOutcome } from "./types";
import { clamp, type Vec3 } from "./vec";

const INSIDE = PITCH.goalHalfWidth - PITCH.postRadius - BALL.radius - 0.04;
const OUTSIDE = PITCH.goalHalfWidth + PITCH.postRadius + BALL.radius;

/**
 * How well the keeper reads a set piece. Tuned with the bigger goal so a
 * free kick still goes in about half the time and a penalty about four
 * times in five. His size, reach and speed never change.
 */
export const READ = {
  /** A free kick he can reach: the save chance before the margin and the pace. */
  free: 0.58,
  /** A penalty: how often he stays up the middle, and how often he picks the right side when he goes. */
  stay: 0.1,
  rightSide: 0.62,
  /** A penalty he guessed and can reach: the save chance before the margin and the pace. */
  penalty: 0.6,
} as const;

/**
 * Where the kick ends up on the goal line, ignoring the wall: into the
 * goal, onto the woodwork, or off target.
 */
function onTarget(from: Vec3, kick: Kick, defending: 0 | 1): { outcome: ShotOutcome | null; y: number; z: number } {
  const hit = fly(from, kick, goalX(defending));
  if (!hit) return { outcome: "wide", y: 0, z: 0 };
  const z = Math.abs(hit.z);
  if (hit.y > PITCH.goalHeight + BALL.radius + PITCH.postRadius) return { outcome: "over", y: hit.y, z: hit.z };
  if (z > OUTSIDE) return { outcome: "wide", y: hit.y, z: hit.z };
  if (z > INSIDE) return { outcome: "post", y: hit.y, z: hit.z };
  if (hit.y > PITCH.goalHeight - BALL.radius - 0.03) return { outcome: "bar", y: hit.y, z: hit.z };
  return { outcome: null, y: hit.y, z: hit.z };
}

/**
 * How far across a keeper can get to a ball arriving after `t` seconds:
 * a step and a stretch standing, a full dive once there is time to push
 * off. A free kick is seen late, over the wall; a penalty needs a guess.
 */
export function keeperReach(t: number, react: number): number {
  const dive = clamp((t - react) / KEEPER.diveTime, 0, 1);
  return 0.55 + dive * 2.75;
}

/**
 * Decides a free kick on target: the keeper reads it once it clears the
 * wall, and saves it if he can reach it in time, better the closer it is
 * to him and the softer it is struck. The keeper then dives for real.
 */
export function judgeFreeKick(state: MatchState, sp: SetPiece, kick: Kick, keeper: Keeper): ShotOutcome {
  const from = { ...state.ball.pos };
  const target = onTarget(from, kick, keeper.team);
  if (target.outcome) return target.outcome;
  const hit = fly(from, kick, keeper.pos.x);
  if (!hit) return "goal";
  const lateral = Math.abs(hit.z - keeper.pos.z);
  const reach = keeperReach(hit.t, 0.22);
  if (lateral > reach || hit.y > KEEPER.reach + 0.45) return "goal";
  const margin = 1 - lateral / reach;
  const save = clamp(READ.free + 0.6 * margin - 0.25 * sp.power + (hit.y > 1.9 ? -0.1 : 0), 0.08, 0.92);
  if (!state.rng.chance(save)) return "goal";
  const speed = Math.hypot(kick.vel.x, kick.vel.y, kick.vel.z);
  return speed < 21 && lateral < 1 && hit.y < 1.7 ? "catch" : "parry";
}

/**
 * A penalty: the keeper must pick a side as it is struck. When he goes
 * he picks the right side a little over half the time, and now and then
 * he stays up the middle. Guessing right, he saves what he can reach in time; a ball
 * tucked in by the post or struck hard is still beyond him.
 */
export function judgePenalty(state: MatchState, sp: SetPiece, kick: Kick, keeper: Keeper): { outcome: ShotOutcome; guess: -1 | 0 | 1; rightWay: boolean } {
  const rng = state.rng;
  const from = { ...state.ball.pos };
  const target = onTarget(from, kick, keeper.team);
  const hit = fly(from, kick, keeper.pos.x);
  const side = !hit || Math.abs(hit.z - keeper.pos.z) < 0.6 ? 0 : Math.sign(hit.z - keeper.pos.z);
  const guess = guessSide(rng.next(), rng.next(), side);
  const rightWay = side === guess;
  if (target.outcome) return { outcome: target.outcome, guess, rightWay: false };
  if (!hit || !rightWay) return { outcome: "goal", guess, rightWay };
  const lateral = Math.abs(hit.z - keeper.pos.z);
  const reach = keeperReach(hit.t, 0.05);
  if (lateral > reach || hit.y > KEEPER.reach + 0.3) return { outcome: "goal", guess, rightWay };
  const save = clamp(READ.penalty + 0.6 * (1 - lateral / reach) - 0.35 * sp.power, 0.05, 0.85);
  return { outcome: rng.chance(save) ? (lateral < 0.8 && hit.y < 1.5 ? "catch" : "parry") : "goal", guess, rightWay };
}

/** The keeper's pick for a penalty going to `side` (0 is down the middle), from two rolls. */
export function guessSide(stayRoll: number, sideRoll: number, side: number): -1 | 0 | 1 {
  if (stayRoll < READ.stay) return 0;
  const way = side === 0 ? (sideRoll < 0.5 ? 1 : -1) : (Math.sign(side) as 1 | -1);
  return sideRoll < READ.rightSide ? way : (-way as 1 | -1);
}

/**
 * The penalty keeper's dive: the right way, planned onto the ball like
 * any save (or a fingertip short); the wrong way, a full length dive to
 * the side he picked; or standing his ground in the middle.
 */
export function penaltyDive(state: MatchState, keeper: Keeper, guess: -1 | 0 | 1, rightWay: boolean): void {
  if (rightWay) return planDive(state, keeper);
  // Stood up the middle and it went past him: he stays on his feet.
  if (guess === 0) return;
  const flight = state.flight;
  const hit = flight ? fly({ ...state.ball.pos }, { vel: { ...state.ball.vel }, spin: { ...state.ball.spin }, time: 0 }, keeper.pos.x) : null;
  const gloveZ = keeper.pos.z + guess * state.rng.range(1.6, 2.4);
  const height = state.rng.range(0.5, 1.4);
  const feet = diveLayout({ fromZ: keeper.pos.z, gloveZ, height }).feet;
  // He goes as it is struck, a little early, which is why he guessed.
  const duration = KEEPER.diveTime;
  keeper.dive = { dir: guess, fromZ: keeper.pos.z, toZ: keeper.pos.z + guess * feet, gloveZ, height, wait: Math.max(0, Math.min(0.05, (hit?.t ?? 0.4) - duration)), duration, standing: false };
  keeper.action = "dive";
  keeper.actionT = 0;
}
