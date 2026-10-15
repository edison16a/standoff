import { isDown } from "./body";
import { locked } from "./linemen";
import type { Match } from "./match";
import type { Rng } from "./rng";
import type { Athlete } from "./types";
import type { V3 } from "./vec";

/**
 * Pressure on the passer. A defender closing on the QB costs him
 * accuracy: the throw leaves the hand off the line he aimed, more the
 * closer the rush, and two men closing count for more than one. A clean
 * pocket throws true. His phone shows the accuracy he has right now.
 */
export const POCKET = {
  /** A defender starts to count inside this many metres, and counts fully at `near`. */
  far: 4.6,
  near: 1.1,
  /** Spread of the miss at full pressure: the angle off the aim, radians, and the share of the throw's pace. */
  angle: 0.12,
  pace: 0.08,
  /** The accuracy shown at full pressure, 0 to 1. */
  floor: 0.3,
} as const;

/** How much one defender `d` metres away presses the passer, 0 to 1. */
export const pressOf = (d: number): number => Math.max(0, Math.min(1, (POCKET.far - d) / (POCKET.far - POCKET.near)));

/** The rush on the QB, 0 (clean pocket) to 1: every free defender closing adds his share. Linemen locked in a block do not count. */
export function pocketPressure(m: Match, qb: Athlete): number {
  let sum = 0;
  for (const o of m.athletes) {
    if (o.team === qb.team || isDown(o) || locked(m, o)) continue;
    sum += pressOf(Math.hypot(o.x - qb.x, o.z - qb.z));
  }
  return Math.min(1, sum);
}

/** The accuracy his phone shows for a pressure, 1 clean to POCKET.floor in a collapsing pocket. */
export const accuracyOf = (pressure: number): number => 1 - (1 - POCKET.floor) * pressure;

/**
 * A throw's velocity as it really leaves the hand under `pressure`:
 * turned off the aimed line and a little long or short. With no rush it
 * is exactly the aimed velocity and rolls no dice.
 */
export function pressuredThrow(vel: V3, pressure: number, rng: Rng): V3 {
  if (pressure <= 0) return { ...vel };
  const turn = rng.gauss(POCKET.angle * pressure);
  const pace = 1 + rng.gauss(POCKET.pace * pressure);
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  return { x: (vel.x * c - vel.z * s) * pace, y: vel.y * pace, z: (vel.x * s + vel.z * c) * pace };
}
