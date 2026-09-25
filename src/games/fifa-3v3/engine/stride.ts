import { clamp } from "./vec";

/**
 * The running rhythm the body and the ball share. The stride is a count
 * of full cycles (two steps, right then left); the simulation advances
 * it with the ground covered and pushes the dribble on it, and the
 * renderer plants the feet on it, so the boot meets the ball on the
 * same frame the ball is pushed and planted feet never skate.
 */

/** Metres covered in one full cycle at this speed: short quick steps when slow, long ones at a sprint. */
export function cycleLength(speed: number): number {
  return clamp(0.5 + 0.26 * speed, 0.6, 2.6);
}

/** Where in the cycle the lead boot pushes the ball, at the end of its swing just before it lands. */
export const TOUCH_AT = 0.94;

/** Progress through the dribble cycle since the last touch, 0 to 1. */
export function sinceTouch(stride: number): number {
  const w = (stride - TOUCH_AT) % 1;
  return w < 0 ? w + 1 : w;
}

const smooth = (v: number) => {
  const t = clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * How far past its resting spot the ball has been pushed, 0 to 1: it
 * leaves the boot quickly after a touch, then the player gathers it in
 * again, back at rest just as the next touch lands.
 */
export function touchPush(stride: number): number {
  const w = sinceTouch(stride);
  // The rise eases out, so the ball jumps off the boot as if struck rather than drifting away.
  return w < 0.3 ? 1 - (1 - w / 0.3) ** 2 : 1 - smooth((w - 0.3) / 0.7);
}
