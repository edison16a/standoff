import { isDown, statsOf } from "./body";
import type { Match } from "./match";
import { PASS } from "./tuning";
import type { Athlete } from "./types";
import type { V3 } from "./vec";

/**
 * The ball as it leaves the hand. Every pass goes exactly where it was
 * aimed, so an open receiver always gets it; whether a covered one does
 * is down to the defenders in the lane (pass-lane.ts). The arm and the
 * rush still show in the spiral: a strong arm spins it tighter, a
 * defender in the QB's face makes it wobble.
 */
export const ERROR = {
  /** Pressure: a defender within this many metres, and what he does to the spiral at arm's length. */
  rush: 3,
  rushSpin: 0.18,
  rushWobble: 0.06,
} as const;

export interface Release {
  vel: V3;
  spin: number;
  /** Half angle of the wobble cone, radians: a tight spiral is a few hundredths. */
  wobble: number;
}

/** How close the nearest pass rusher is, 0 (nobody near) to 1 (in his face). */
export function pressure(m: Match, qb: Athlete): number {
  let near = Infinity;
  for (const o of m.athletes) {
    // A rusher who shed his blocker counts; one still locked up does not.
    if (o.team === qb.team || (o.role === "lineman" && !m.lines[o.slot]?.loose) || isDown(o)) continue;
    near = Math.min(near, Math.hypot(o.x - qb.x, o.z - qb.z));
  }
  return Math.max(0, 1 - near / ERROR.rush);
}

/** The ball out of the hand on the aimed velocity, with a spiral as tight as the arm and the rush allow. */
export function release(m: Match, qb: Athlete, aimed: V3): Release {
  const arm = statsOf(qb).arm;
  const p = pressure(m, qb);
  const spin = PASS.spin * (0.85 + arm * 0.02) * (1 - p * ERROR.rushSpin) * (1 + m.rng.gauss(0.05));
  const wobble = 0.02 + (10 - arm) * 0.005 + p * ERROR.rushWobble + Math.abs(m.rng.gauss(0.015));
  return { vel: { ...aimed }, spin, wobble };
}
