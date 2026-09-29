import { diveLayout } from "./dive";
import type { Launch } from "./set-piece-kick";
import { fly } from "./shot-aim";
import { BALL, KEEPER, PITCH } from "./tuning";
import type { Keeper, ShotOutcome } from "./types";
import type { Rng } from "./rng";
import { clamp, clamp01, type Vec2 } from "./vec";

const GW = PITCH.goalHalfWidth;
const GH = PITCH.goalHeight;
const R = BALL.radius;
const PR = PITCH.postRadius;
/** How far to the side a keeper can get the gloves with a full dive and time to make it. */
const DIVE_REACH = 2.9;

/** Where a ball struck like this crosses the plane at `lineX`, and when. */
export interface Crossing {
  y: number;
  z: number;
  t: number;
}

export function crossing(spot: Vec2, launch: Launch, lineX: number): Crossing | null {
  return fly({ x: spot.x, y: R, z: spot.z }, { vel: { ...launch.vel }, spin: { ...launch.spin }, time: 0 }, lineX);
}

/** What the woodwork and the goal make of a ball crossing the goal line here, before any keeper. */
export function onGoal(c: Crossing): Exclude<ShotOutcome, "catch" | "parry" | "blocked"> {
  const az = Math.abs(c.z);
  if (az < GW - PR - R && c.y < GH - PR - R) return "goal";
  if (az < GW + PR + R && c.y < GH + PR + R) return c.y > GH - PR - R && az < GW ? "bar" : "post";
  return c.y >= GH ? "over" : "wide";
}

/**
 * Whether a keeper standing at `k` gets to a ball crossing their line at
 * `c`. They need time to react (longer with a wall in the way), then
 * the dive covers ground quickly; high corners are the hardest and a
 * fierce shot is often only pushed away.
 */
export function judgeSave(k: Keeper, c: Crossing, speed: number, reaction: number, rng: Rng): "catch" | "parry" | "goal" {
  const lateral = Math.abs(c.z - k.pos.z);
  const high = Math.max(0, c.y - 1.6);
  const effective = Math.hypot(lateral, high * 0.9);
  const time = c.t - reaction;
  const reach = time <= 0 ? 0.35 : 0.5 + (DIVE_REACH - 0.5) * clamp01(time / 0.45);
  const margin = reach - effective;
  const pace = clamp(1.3 - speed / 38, 0.45, 1);
  if (!rng.chance(clamp01((0.35 + margin * 0.8) * pace))) return "goal";
  return speed > 24 || margin < 0.45 ? "parry" : "catch";
}

/**
 * A penalty keeper guesses. Most dive to a side as the ball is struck,
 * a few stay up. Guess right and it comes down to reach and pace; guess
 * wrong and only a ball down the middle can hit a trailing leg.
 */
export function penaltyGuess(rng: Rng, shotSide: number): -1 | 0 | 1 {
  if (rng.chance(0.16)) return 0;
  const right = rng.chance(0.56);
  const side = shotSide === 0 ? rng.sign() : (Math.sign(shotSide) as 1 | -1);
  return right ? side : (-side as 1 | -1);
}

export function judgePenalty(k: Keeper, c: Crossing, speed: number, guess: -1 | 0 | 1, rng: Rng): "catch" | "parry" | "goal" {
  const middle = Math.abs(c.z) < 0.55;
  if (guess === 0) {
    if (Math.abs(c.z - k.pos.z) < 0.9 && c.y < 1.9) return speed > 22 ? "parry" : "catch";
    return "goal";
  }
  if (middle) return rng.chance(0.15) ? "parry" : "goal";
  if (Math.sign(c.z) !== guess) return "goal";
  // Committed early, the keeper has the whole flight to get across.
  return judgeSave(k, c, speed, -0.05, rng);
}

/** Sends a penalty keeper the way they guessed: to the ball if they read it, well short of it if not. */
export function penaltyDive(k: Keeper, c: Crossing, guess: -1 | 1, save: boolean, rng: Rng): void {
  const right = Math.sign(c.z) === guess;
  const gloveZ = save ? c.z : right ? c.z - guess * rng.range(0.35, 0.6) : k.pos.z + guess * rng.range(1.7, 2.4);
  const height = save || right ? clamp(c.y, 0.15, 2.4) : rng.range(0.4, 1.3);
  const duration = clamp(Math.min(KEEPER.diveTime, c.t), 0.12, KEEPER.diveTime);
  const feet = diveLayout({ fromZ: k.pos.z, gloveZ, height }).feet;
  k.dive = { dir: guess, fromZ: k.pos.z, toZ: k.pos.z + guess * feet, gloveZ, height, wait: Math.max(0, c.t - duration - 0.04), duration, standing: false };
  k.action = "dive";
  k.actionT = 0;
}
