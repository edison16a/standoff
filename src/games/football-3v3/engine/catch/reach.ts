import { statsOf } from "../body";
import { catchReach } from "../build-effects";
import type { Athlete } from "../types";
import type { V3 } from "../vec";

/**
 * Where a player's hands can get to: a capsule from the hips up to a
 * leap over the head, a little ahead of the body, as wide as the arms
 * reach out. Good hands reach further round the body; a dive stretches
 * the whole body out along the turf.
 */
export interface Reach {
  /** The capsule's axis, low end and high end. */
  low: V3;
  high: V3;
  radius: number;
}

export const HANDS = {
  /** Hip height up to the highest a leap gets the hands, metres. */
  low: 0.55,
  high: 2.85,
  /** How far the arms reach out from the body's line, for average hands. */
  arms: 0.82,
  dive: 1.55,
  /** The hands work a little ahead of the chest. */
  ahead: 0.18,
} as const;

export function reachOf(a: Athlete): Reach {
  const k = catchReach(statsOf(a));
  const fx = Math.sin(a.yaw) * HANDS.ahead;
  const fz = Math.cos(a.yaw) * HANDS.ahead;
  const diving = a.action.kind === "dive";
  const radius = (diving ? HANDS.dive : HANDS.arms) * k;
  // The top of the axis sits below the leap, so the round end of the reach tops out just over it.
  return {
    low: { x: a.x + fx, y: diving ? 0.3 : HANDS.low, z: a.z + fz },
    high: { x: a.x + fx, y: diving ? 0.6 : HANDS.high - radius * 0.75, z: a.z + fz },
    radius,
  };
}

/** Closest approach of two segments: the distance, and how far along each (0 to 1). */
export function segmentGap(p1: V3, q1: V3, p2: V3, q2: V3): { d: number; s: number; t: number } {
  const d1 = { x: q1.x - p1.x, y: q1.y - p1.y, z: q1.z - p1.z };
  const d2 = { x: q2.x - p2.x, y: q2.y - p2.y, z: q2.z - p2.z };
  const r = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
  const a = d1.x * d1.x + d1.y * d1.y + d1.z * d1.z;
  const e = d2.x * d2.x + d2.y * d2.y + d2.z * d2.z;
  const f = d2.x * r.x + d2.y * r.y + d2.z * r.z;
  let s = 0;
  let t = 0;
  if (a < 1e-12 && e < 1e-12) return { d: Math.hypot(r.x, r.y, r.z), s, t };
  if (a < 1e-12) t = clamp01(f / e);
  else {
    const c = d1.x * r.x + d1.y * r.y + d1.z * r.z;
    if (e < 1e-12) s = clamp01(-c / a);
    else {
      const b = d1.x * d2.x + d1.y * d2.y + d1.z * d2.z;
      const den = a * e - b * b;
      s = den > 1e-12 ? clamp01((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  const x = p1.x + d1.x * s - (p2.x + d2.x * t);
  const y = p1.y + d1.y * s - (p2.y + d2.y * t);
  const z = p1.z + d1.z * s - (p2.z + d2.z * t);
  return { d: Math.hypot(x, y, z), s, t };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Where the ball, moving from `from` to `to` this sub step, passes
 * nearest the hands, and how far from the reach's axis: inside the
 * radius the hands can get to it.
 */
export function meetHands(from: V3, to: V3, reach: Reach): { gap: number; ball: V3; hand: V3 } {
  const g = segmentGap(from, to, reach.low, reach.high);
  const ball = { x: from.x + (to.x - from.x) * g.s, y: from.y + (to.y - from.y) * g.s, z: from.z + (to.z - from.z) * g.s };
  const hand = { x: reach.low.x + (reach.high.x - reach.low.x) * g.t, y: reach.low.y + (reach.high.y - reach.low.y) * g.t, z: reach.low.z + (reach.high.z - reach.low.z) * g.t };
  return { gap: g.d, ball, hand };
}
