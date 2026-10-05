import type { Ball } from "../types";
import type { Vec3 } from "../vec";
import { BALL_BODY } from "./constants";

const R = BALL_BODY.radius;
const ALPHA = BALL_BODY.inertia;

/** A surface the ball strikes: the way out of it, how springy and grippy it is, and how it moves. */
export interface Surface {
  /** Unit normal pointing from the surface toward the ball's centre. */
  n: Vec3;
  restitution: number;
  friction: number;
  /** The surface's own velocity where it meets the ball, for a boot, a glove or a moving net. */
  vel?: Vec3;
}

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * One impact of the ball on a surface, as two impulses through the
 * point of contact. Along the normal the ball bounces with the surface's
 * restitution. Along the surface, friction acts against the slip of the
 * contact point (the ball's travel plus its spin), up to Coulomb's limit
 * of friction times the normal impulse: a glancing, skidding ball keeps
 * its pace, a slower one grips and leaves rolling. The same friction
 * turns the spin, so topspin kicks on, backspin checks, and sidespin
 * throws the ball off a post. Returns the speed into the surface, or 0
 * when the ball was already leaving it.
 */
export function impact(ball: Ball, s: Surface): number {
  const v = ball.vel;
  const w = ball.spin;
  const n = s.n;
  const sv = s.vel ?? ZERO;
  const rvx = v.x - sv.x;
  const rvy = v.y - sv.y;
  const rvz = v.z - sv.z;
  const vn = rvx * n.x + rvy * n.y + rvz * n.z;
  if (vn >= 0) return 0;
  // The contact point sits at -R n from the centre; its velocity adds the spin's sweep, w x r.
  const rx = -R * n.x;
  const ry = -R * n.y;
  const rz = -R * n.z;
  const ux = rvx + (w.y * rz - w.z * ry);
  const uy = rvy + (w.z * rx - w.x * rz);
  const uz = rvz + (w.x * ry - w.y * rx);
  const un = ux * n.x + uy * n.y + uz * n.z;
  let tx = ux - un * n.x;
  let ty = uy - un * n.y;
  let tz = uz - un * n.z;
  const slip = Math.hypot(tx, ty, tz);
  const jn = -(1 + s.restitution) * vn;
  // Impulse per unit mass that would leave the contact point rolling, and the most friction allows.
  const stick = (slip * ALPHA) / (1 + ALPHA);
  const jt = Math.min(stick, s.friction * jn);
  if (slip > 1e-9) {
    tx /= slip;
    ty /= slip;
    tz /= slip;
  }
  v.x += jn * n.x - jt * tx;
  v.y += jn * n.y - jt * ty;
  v.z += jn * n.z - jt * tz;
  // The friction impulse at the contact point twists the ball: dw = r x J / I.
  const k = 1 / (ALPHA * R * R);
  w.x += (ry * -jt * tz - rz * -jt * ty) * k;
  w.y += (rz * -jt * tx - rx * -jt * tz) * k;
  w.z += (rx * -jt * ty - ry * -jt * tx) * k;
  return -vn;
}
