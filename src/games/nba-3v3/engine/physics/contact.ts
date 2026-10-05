import type { V3 } from "../vec";
import { BALL } from "./ball-spec";

/**
 * One contact of the ball with a surface, as impulses on a thin rubber
 * shell: a push along the normal that keeps `e` of the speed coming in,
 * and friction along the surface that trades sliding for spin up to the
 * Coulomb limit. That is what makes backspin kill a shot on the rim, a
 * layup kiss off the glass, and a dribble skip or check on the floor.
 * The surface may be moving (a hand swatting the ball), and `support`
 * adds the normal impulse of a ball resting on it, so friction keeps
 * working while it rolls.
 */

/** A push at the skin moves a shell 1 + 1/(2/3) = 2.5 times as much as the same push at its centre. */
const SLIP = 1 + 1 / BALL.inertia;
const TWIST = 1 / (BALL.inertia * BALL.radius * BALL.radius);
const ZERO: V3 = { x: 0, y: 0, z: 0 };

export interface Hit {
  /** Speed into the surface before the contact, metres a second. */
  impact: number;
  /** How fast the skin slid across the surface. */
  slide: number;
}

/**
 * Applies the contact to `vel` and `spin`. `n` is the outward normal at
 * the contact. Returns null when the ball is already moving away and
 * there is no support to grip with.
 */
export function bounce(vel: V3, spin: V3, n: V3, e: number, mu: number, surface: V3 = ZERO, support = 0): Hit | null {
  const r = BALL.radius;
  const rvx = vel.x - surface.x;
  const rvy = vel.y - surface.y;
  const rvz = vel.z - surface.z;
  const vn = rvx * n.x + rvy * n.y + rvz * n.z;
  if (vn >= 0 && support <= 0) return null;
  // The skin at the contact sits r in from the centre along -n and moves with v plus spin crossed with that arm.
  const ax = -n.x * r;
  const ay = -n.y * r;
  const az = -n.z * r;
  const cx = rvx + (spin.y * az - spin.z * ay);
  const cy = rvy + (spin.z * ax - spin.x * az);
  const cz = rvz + (spin.x * ay - spin.y * ax);
  const cn = cx * n.x + cy * n.y + cz * n.z;
  const tx = cx - cn * n.x;
  const ty = cy - cn * n.y;
  const tz = cz - cn * n.z;
  const slide = Math.hypot(tx, ty, tz);
  const jn = Math.max(0, -(1 + e) * vn) + support;
  if (vn < 0) {
    const push = -(1 + e) * vn;
    vel.x += push * n.x;
    vel.y += push * n.y;
    vel.z += push * n.z;
  }
  if (slide > 1e-7 && jn > 0) {
    // Friction stops the slide outright if the grip allows, else takes what it can.
    const jt = Math.min(mu * jn, slide / SLIP);
    const fx = (-tx / slide) * jt;
    const fy = (-ty / slide) * jt;
    const fz = (-tz / slide) * jt;
    vel.x += fx;
    vel.y += fy;
    vel.z += fz;
    // The same push on the skin twists the ball: the arm crossed with the push, over the inertia.
    spin.x += (ay * fz - az * fy) * TWIST;
    spin.y += (az * fx - ax * fz) * TWIST;
    spin.z += (ax * fy - ay * fx) * TWIST;
  }
  return { impact: Math.max(0, -vn), slide };
}

/** The spin of a ball rolling without slipping at velocity `v` on a floor. */
export function rollingSpin(v: V3, out: V3 = { x: 0, y: 0, z: 0 }): V3 {
  out.x = v.z / BALL.radius;
  out.y = 0;
  out.z = -v.x / BALL.radius;
  return out;
}
