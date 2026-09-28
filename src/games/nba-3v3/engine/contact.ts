import type { V3 } from "./vec";

/**
 * One bounce of the ball off a surface, as a hollow rubber sphere: a
 * push along the surface normal that keeps `e` of the speed coming in,
 * and a grip along the surface that trades sliding for spin, up to the
 * friction limit. That is what makes backspin kill a shot on the rim, a
 * spinning layup kiss off the glass, and a dribble pick up topspin.
 */

/** A hollow ball's moment of inertia is two thirds of m r squared, so a push on its skin moves it 2.5 times as much. */
const SLIP = 2.5;

export interface Hit {
  /** Speed into the surface before the bounce, in metres per second. */
  impact: number;
  /** How fast the skin slid over the surface at the moment of contact. */
  slide: number;
}

/**
 * Bounces `vel` and `spin` off a surface with outward normal `n`. `r` is
 * the ball's radius. Returns null when the ball is already moving away.
 */
export function bounce(vel: V3, spin: V3, n: V3, r: number, e: number, mu: number): Hit | null {
  const vn = vel.x * n.x + vel.y * n.y + vel.z * n.z;
  if (vn >= 0) return null;
  // The skin at the contact point, r in from the centre along -n, moves with v plus spin crossed with that arm.
  const ax = -n.x * r;
  const ay = -n.y * r;
  const az = -n.z * r;
  const cx = vel.x + (spin.y * az - spin.z * ay);
  const cy = vel.y + (spin.z * ax - spin.x * az);
  const cz = vel.z + (spin.x * ay - spin.y * ax);
  const cn = cx * n.x + cy * n.y + cz * n.z;
  const tx = cx - cn * n.x;
  const ty = cy - cn * n.y;
  const tz = cz - cn * n.z;
  const slide = Math.hypot(tx, ty, tz);
  const jn = -(1 + e) * vn;
  vel.x += jn * n.x;
  vel.y += jn * n.y;
  vel.z += jn * n.z;
  if (slide > 1e-6) {
    // Friction stops the slide outright if it can, else takes what the grip allows.
    const jt = Math.min(mu * jn, slide / SLIP);
    const fx = (-tx / slide) * jt;
    const fy = (-ty / slide) * jt;
    const fz = (-tz / slide) * jt;
    vel.x += fx;
    vel.y += fy;
    vel.z += fz;
    // The same push on the skin twists the ball: arm crossed with the push, over the inertia.
    const k = 1.5 / (r * r);
    spin.x += (ay * fz - az * fy) * k;
    spin.y += (az * fx - ax * fz) * k;
    spin.z += (ax * fy - ay * fx) * k;
  }
  return { impact: -vn, slide };
}

/** The restitution of the rim: lively on a soft touch, dead on a hard one as the spring loaded ring gives. */
export function rimRestitution(base: number, impact: number): number {
  if (impact < 0.25) return 0;
  return base * (1 - Math.min(0.35, Math.max(0, impact - 2) * 0.08));
}
