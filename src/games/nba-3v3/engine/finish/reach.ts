import { buildOf } from "../athlete";
import type { Athlete } from "../types";
import type { V3 } from "../vec";

/**
 * The drawn body's own proportions (see `render/models/rig.ts`), so a
 * ball the engine puts in the hands at the rim is somewhere the drawn
 * hands can really reach. The engine's `standingReach` is a fingertip
 * reach for blocks and rebounds; the ball sits in the palm, lower.
 */

/** Shoulder joint above the soles, standing tall: legs, hips, and nine tenths of the torso. */
export function shoulderHeight(a: Athlete): number {
  const H = buildOf(a).body.height;
  return 0.7635 * H + 0.075;
}

/** Half the distance between the shoulder joints. */
export function shoulderHalf(a: Athlete): number {
  const c = buildOf(a).body;
  return 0.1 * c.height * c.width;
}

/** Shoulder to the middle of the palm with the arm straight: upper arm, forearm and the palm. */
export function armLength(a: Athlete): number {
  const c = buildOf(a).body;
  return 0.316 * c.height * c.reach + 0.07;
}

/** How much of the arm a held ball may use: never quite locked, so the elbow keeps a little bend. */
export const ARM_USE = 0.96;

/**
 * The shoulder on the `hand` side (1 right, -1 left) in the world, for a
 * body at (x, y, z) facing `yaw`, leaning a little forward as it reaches.
 */
export function shoulderAt(a: Athlete, at: V3, yaw: number, hand: number, out: V3): V3 {
  const half = shoulderHalf(a) * hand;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  // The player's right is -x when facing +z.
  out.x = at.x + fx * 0.05 - fz * half;
  out.y = at.y + shoulderHeight(a);
  out.z = at.z + fz * 0.05 + fx * half;
  return out;
}

/** Pulls `p` back inside the arm's reach from `shoulder`, so a hand can always be on it. */
export function withinReach(p: V3, shoulder: V3, reach: number): V3 {
  const dx = p.x - shoulder.x;
  const dy = p.y - shoulder.y;
  const dz = p.z - shoulder.z;
  const d = Math.hypot(dx, dy, dz);
  if (d <= reach) return p;
  const k = reach / d;
  p.x = shoulder.x + dx * k;
  p.y = shoulder.y + dy * k;
  p.z = shoulder.z + dz * k;
  return p;
}
