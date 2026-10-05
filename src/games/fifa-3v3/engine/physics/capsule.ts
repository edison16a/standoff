import type { Ball } from "../types";
import type { Vec3 } from "../vec";
import { BALL_BODY } from "./constants";
import { impact } from "./impulse";

const R = BALL_BODY.radius;

/** A rounded rod from `a` to `b`: a post, the bar, a leg, a body, an arm. */
export interface Capsule {
  a: Vec3;
  b: Vec3;
  radius: number;
}

/** The point on the rod's middle line nearest to `p`. */
export function nearestOn(c: Capsule, p: Vec3): Vec3 {
  const ax = c.b.x - c.a.x;
  const ay = c.b.y - c.a.y;
  const az = c.b.z - c.a.z;
  const len2 = ax * ax + ay * ay + az * az;
  const t = len2 > 1e-12 ? Math.max(0, Math.min(1, ((p.x - c.a.x) * ax + (p.y - c.a.y) * ay + (p.z - c.a.z) * az) / len2)) : 0;
  return { x: c.a.x + ax * t, y: c.a.y + ay * t, z: c.a.z + az * t };
}

/** How far the ball's surface is from the rod's, negative when they overlap. */
export function gap(c: Capsule, p: Vec3): number {
  const q = nearestOn(c, p);
  return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) - c.radius - R;
}

/**
 * The ball against a rod. Overlapping, the ball is pushed back out
 * along the line between the two centres, which is how a round post
 * sends a ball off at an angle that depends on where it was struck, and
 * then bounces with the given restitution and friction. `vel` is the
 * rod's own motion at that point. Returns the speed into the rod, 0 for no hit.
 */
export function hitCapsule(ball: Ball, c: Capsule, restitution: number, friction: number, vel?: Vec3): number {
  const p = ball.pos;
  const q = nearestOn(c, p);
  const dx = p.x - q.x;
  const dy = p.y - q.y;
  const dz = p.z - q.z;
  const d = Math.hypot(dx, dy, dz);
  const min = c.radius + R;
  if (d >= min) return 0;
  // Dead centre on the line: push straight up rather than divide by zero.
  const n = d > 1e-9 ? { x: dx / d, y: dy / d, z: dz / d } : { x: 0, y: 1, z: 0 };
  p.x = q.x + n.x * min;
  p.y = q.y + n.y * min;
  p.z = q.z + n.z * min;
  return impact(ball, { n, restitution, friction, vel });
}
