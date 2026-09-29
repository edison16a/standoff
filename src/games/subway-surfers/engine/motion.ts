import { JUMP, SIDE, SPEED } from "./tuning";

/**
 * How the body moves through the air and across the tracks. Pure
 * functions of the tuning, so the runner, the coin arcs laid on the
 * course and the pose on screen all agree on one jump.
 */

/** The speed a jump leaves the ground at, to top out `height` metres up. */
export function launchSpeed(height: number): number {
  return Math.sqrt(2 * JUMP.rise * height);
}

/** Seconds from takeoff to the top of a jump. */
export function riseTime(height: number): number {
  return Math.sqrt((2 * height) / JUMP.rise);
}

/** Seconds from the top of a jump back down to where it started. */
export function fallTime(height: number): number {
  return Math.sqrt((2 * height) / JUMP.fall);
}

/** Seconds in the air, from takeoff to landing at the same level. */
export function airTime(height: number): number {
  return riseTime(height) + fallTime(height);
}

/** Height above takeoff, `t` seconds into a jump that tops out at `height`. */
export function arcHeight(height: number, t: number): number {
  const up = riseTime(height);
  if (t <= up) return launchSpeed(height) * t - 0.5 * JUMP.rise * t * t;
  const down = t - up;
  return Math.max(0, height - 0.5 * JUMP.fall * down * down);
}

/** Gravity for this step: gentle while rising, strong while falling. */
export function gravity(vy: number): number {
  return vy > 0 ? JUMP.rise : JUMP.fall;
}

/**
 * How far the body moves toward its lane this step, given `dx` metres
 * still to go. Flat out while far, then in proportion to what is left,
 * so the move starts at once and settles without a bump.
 */
export function sideStep(dx: number, dt: number): number {
  const left = Math.abs(dx);
  const speed = Math.max(SIDE.minSpeed, Math.min(SIDE.maxSpeed, SIDE.rate * left));
  return Math.sign(dx) * Math.min(left, speed * dt);
}

/** Share of the pace `time` seconds into a run: a quick burst from a standing start, easing into full stride. */
export function startBurst(time: number): number {
  const t = Math.min(1, Math.max(0, time / SPEED.burstS));
  return SPEED.burstFrom + (1 - SPEED.burstFrom) * (1 - (1 - t) * (1 - t));
}
