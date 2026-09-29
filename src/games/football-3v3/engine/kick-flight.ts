import { attackSign, type TeamId } from "../teams";
import { BALL_DRAG, integrate } from "./ball";
import { FIELD } from "./field";
import { aimError } from "./meters";
import { KICK, STEP } from "./tuning";
import type { KickKind } from "./types";
import { lerp, v3, type Vec2, type Vec3 } from "./vec";

/** The launch of a kick from the stopped bars: power sets the speed, the accuracy bar the line. */
export function kickVelocity(kind: KickKind, team: TeamId, spot: Vec2, aim: number, power: number): Vec3 {
  const s = attackSign(team);
  const punt = kind === "punt";
  const speed = punt ? lerp(KICK.puntSlow, KICK.puntFast, power) : lerp(KICK.goalSlow, KICK.goalFast, power);
  const up = punt ? KICK.puntAngle : KICK.goalAngle;
  // Field goals are aimed at the middle of the posts; punts straight down the field.
  const posts = { x: s * FIELD.endLine, z: 0 };
  const heading = punt ? (s > 0 ? 0 : Math.PI) : Math.atan2(posts.z - spot.z, posts.x - spot.x);
  const yaw = heading + aimError(aim);
  const flat = Math.cos(up) * speed;
  return v3(Math.cos(yaw) * flat, Math.sin(up) * speed, Math.sin(yaw) * flat);
}

export type GoalResult = "good" | "wide" | "short";

/**
 * Flies a field goal to the plane of the posts: good between the uprights
 * and over the bar, wide outside them, short if it comes down first.
 */
export function goalResult(team: TeamId, from: Vec3, vel: Vec3): GoalResult {
  const p = { ...from };
  const v = { ...vel };
  const s = attackSign(team);
  for (let t = 0; t < 8; t += STEP) {
    integrate(p, v, BALL_DRAG.tumble, STEP);
    if (s * p.x >= FIELD.endLine) return crossing(p);
    if (p.y <= 0) return "short";
  }
  return "short";
}

/** Where a kick crossing the plane of the posts is judged. */
export function crossing(p: Vec3): GoalResult {
  if (Math.abs(p.z) > FIELD.postHalfWidth) return "wide";
  if (p.y < FIELD.crossbar || p.y > FIELD.uprightTop + 20) return "short";
  return "good";
}

/** The least power that puts a dead straight kick through from this spot, or null if none can. */
export function powerNeeded(team: TeamId, spot: Vec2): number | null {
  for (let p = 0; p <= 1.0001; p += 0.02) {
    const vel = kickVelocity("fieldgoal", team, spot, 0, p);
    if (goalResult(team, v3(spot.x, 0.15, spot.z), vel) === "good") return p;
  }
  return null;
}

/** A field goal's length as the broadcast says it: from the spot to the posts. */
export function kickLength(team: TeamId, spot: Vec2): number {
  return Math.round(Math.abs(attackSign(team) * FIELD.endLine - spot.x));
}
