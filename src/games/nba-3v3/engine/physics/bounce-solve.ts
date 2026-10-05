import { BALL, FLOOR, restitution } from "./ball-spec";

/**
 * How hard to push a ball down so that, after one bounce on the floor,
 * it comes back up to a height at a set time: a dribble meeting the
 * hand, or a bounce pass meeting the catcher's hands. It is worked out
 * under gravity with the floor's real restitution at the impact speed;
 * the air barely matters over a metre or two.
 */

const G = BALL.gravity;

/** Seconds from leaving `y0` going down at `v0` until the rebound rises through `y1`, or Infinity if it never gets there. */
export function bounceTime(v0: number, y0: number, y1: number): number {
  const d0 = Math.max(0, y0 - BALL.radius);
  const d1 = Math.max(0, y1 - BALL.radius);
  const v1 = Math.sqrt(v0 * v0 + 2 * G * d0);
  const t1 = (v1 - v0) / G;
  const v2 = restitution(FLOOR, v1) * v1;
  const reach = v2 * v2 - 2 * G * d1;
  if (reach < 0) return Infinity;
  return t1 + (v2 - Math.sqrt(reach)) / G;
}

/**
 * The downward speed off the hand at `y0` that brings the ball back up
 * through `y1` exactly `time` seconds later. When even a soft push gets
 * there sooner, the softest that reaches it at all, so the hand meets
 * the ball at the top of its bounce.
 */
export function bounceDrop(y0: number, y1: number, time: number): number {
  let lo = 0;
  let hi = 16;
  if (bounceTime(hi, y0, y1) > time) return hi;
  // The softest push that still reaches y1.
  if (bounceTime(lo, y0, y1) === Infinity) {
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (bounceTime(mid, y0, y1) === Infinity) lo = mid;
      else hi = mid;
    }
    if (bounceTime(hi, y0, y1) <= time) return hi;
    lo = hi;
    hi = 16;
  } else if (bounceTime(lo, y0, y1) <= time) return 0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (bounceTime(mid, y0, y1) > time) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
