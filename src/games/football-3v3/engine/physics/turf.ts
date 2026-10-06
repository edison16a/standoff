import type { V3 } from "../vec";
import { support } from "./ball-shape";
import { collide, pointVelocity, type Body } from "./contact";

/**
 * The turf under the ball. Leather on grass: a lively bounce off a hard
 * landing that dies away for soft ones so the ball settles, grippy
 * friction, and grass that slows a rolling or skidding ball.
 */
export const TURF = {
  restitution: 0.58,
  friction: 0.62,
  /** Below this landing speed the ball no longer bounces, it just lands. */
  dead: 0.35,
  /** From this landing speed up it bounces with the full restitution. */
  live: 1.4,
  /** Grass drag on a ball lying in it: a share of speed and spin lost per second. */
  grass: 0.9,
  roll: 1.6,
  /** Extra hold on a ball that has nearly stopped, so it stops rocking. */
  rest: 4,
  restSpeed: 0.6,
} as const;

const UP: V3 = { x: 0, y: 1, z: 0 };
const DOWN: V3 = { x: 0, y: -1, z: 0 };
const STILL: V3 = { x: 0, y: 0, z: 0 };

export interface TurfBody extends Body {
  pos: V3;
}

/** How much bounce a landing at this downward speed has. */
export function bounciness(down: number): number {
  if (down <= TURF.dead) return 0;
  if (down >= TURF.live) return TURF.restitution;
  return (TURF.restitution * (down - TURF.dead)) / (TURF.live - TURF.dead);
}

/**
 * Keeps the ball on top of the turf for one sub step of h seconds. The
 * lowest point of the spheroid is the contact: when that is a tip the
 * bounce kicks the ball into a spin and up, when it is a side it skids.
 * Returns the bounce impulse in newton seconds, zero when only touching.
 */
export function touchTurf(b: TurfBody, h: number): number {
  const r = support(b.q, DOWN);
  const depth = -(b.pos.y + r.y);
  if (depth < -0.004) return 0;
  let j = 0;
  if (depth > 0) {
    b.pos.y += depth;
    const down = -pointVelocity(b, r).y;
    j = collide(b, r, { n: UP, vel: STILL, restitution: bounciness(down), friction: TURF.friction });
  }
  // Lying in the grass: it drags on the ball and its spin, harder once it has nearly stopped.
  const slow = Math.hypot(b.vel.x, b.vel.y, b.vel.z) < TURF.restSpeed ? TURF.rest : 0;
  const k = Math.exp(-(TURF.grass + slow) * h);
  b.vel.x *= k;
  b.vel.z *= k;
  const kr = Math.exp(-(TURF.roll + slow) * h);
  b.L.x *= kr;
  b.L.y *= kr;
  b.L.z *= kr;
  return j;
}
