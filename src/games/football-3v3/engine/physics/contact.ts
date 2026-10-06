import { cross3, dot3, type V3 } from "../vec";
import { BALL_SHAPE, invInertia } from "./ball-shape";
import type { Quat } from "./quat";

/** What a contact impulse acts on: the ball's motion. */
export interface Body {
  vel: V3;
  q: Quat;
  /** Angular momentum, world frame. */
  L: V3;
}

/** Velocity of the ball's surface at offset r from its centre. */
export function pointVelocity(b: Body, r: V3): V3 {
  const w = invInertia(b.q, b.L);
  const s = cross3(w, r);
  return { x: b.vel.x + s.x, y: b.vel.y + s.y, z: b.vel.z + s.z };
}

/** How hard the ball is to push at offset r along unit direction d: 1/m plus the turning part. */
function effectiveInverseMass(b: Body, r: V3, d: V3): number {
  const k = cross3(invInertia(b.q, cross3(r, d)), r);
  return 1 / BALL_SHAPE.mass + dot3(d, k);
}

/** Applies impulse j at offset r: it moves the ball and, off centre, turns it. */
export function applyImpulse(b: Body, r: V3, j: V3): void {
  b.vel.x += j.x / BALL_SHAPE.mass;
  b.vel.y += j.y / BALL_SHAPE.mass;
  b.vel.z += j.z / BALL_SHAPE.mass;
  const t = cross3(r, j);
  b.L.x += t.x;
  b.L.y += t.y;
  b.L.z += t.z;
}

export interface Surface {
  /** Unit normal out of the surface, toward the ball. */
  n: V3;
  /** The surface's own velocity: zero for the turf, a hand's for a hand. */
  vel: V3;
  restitution: number;
  friction: number;
}

/**
 * A collision at contact offset r: a bounce along the normal with the
 * surface's restitution, then Coulomb friction across it, at most
 * friction times the bounce. Because r is off the centre for a spheroid,
 * the bounce also spins the ball and its spin kicks back into the
 * bounce: that is what makes a football's hops unpredictable. Returns
 * the normal impulse, zero when the ball was already leaving.
 */
export function collide(b: Body, r: V3, s: Surface): number {
  const rel = (): V3 => {
    const p = pointVelocity(b, r);
    return { x: p.x - s.vel.x, y: p.y - s.vel.y, z: p.z - s.vel.z };
  };
  const v0 = rel();
  const vn = dot3(v0, s.n);
  if (vn >= 0) return 0;
  const jn = (-(1 + s.restitution) * vn) / effectiveInverseMass(b, r, s.n);
  applyImpulse(b, r, { x: s.n.x * jn, y: s.n.y * jn, z: s.n.z * jn });
  const v1 = rel();
  const vn1 = dot3(v1, s.n);
  const slip = { x: v1.x - vn1 * s.n.x, y: v1.y - vn1 * s.n.y, z: v1.z - vn1 * s.n.z };
  const ls = Math.hypot(slip.x, slip.y, slip.z);
  if (ls > 1e-6) {
    const t = { x: -slip.x / ls, y: -slip.y / ls, z: -slip.z / ls };
    const jt = Math.min(ls / effectiveInverseMass(b, r, t), s.friction * jn);
    applyImpulse(b, r, { x: t.x * jt, y: t.y * jt, z: t.z * jt });
  }
  return jn;
}
