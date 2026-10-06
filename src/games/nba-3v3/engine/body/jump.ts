import { BODY } from "./body-spec";

/**
 * Jumps under real gravity. Once the feet leave the floor nothing can
 * change the flight, so the height, the time up there and the landing
 * all follow from the speed off the floor.
 */

const G = BODY.gravity;

/** Seconds off the floor for a jump that rises `peak` metres: up and back down. */
export function hangTime(peak: number): number {
  return 2 * Math.sqrt((2 * Math.max(0, peak)) / G);
}

/** The speed up off the floor that reaches `peak`. */
export function takeoffSpeed(peak: number): number {
  return Math.sqrt(2 * G * Math.max(0, peak));
}

/** Height after `t` seconds in the air, leaving the floor at `v0` metres a second. Never below the floor. */
export function heightAt(v0: number, t: number): number {
  return Math.max(0, v0 * t - 0.5 * G * t * t);
}

/**
 * The speed off the floor that has the body at `height` exactly `t`
 * seconds later, for a dunk or a layup that must meet the rim on time.
 * A showier dunk that needs longer goes a touch higher and slams on
 * the way down; the shortest possible is the plain jump to that height.
 */
export function speedToMeet(height: number, t: number): number {
  const plain = takeoffSpeed(height);
  if (t <= 1e-3) return plain;
  return Math.max(plain, height / t + 0.5 * G * t);
}

/** Seconds to fall from `height` with vertical speed `vy` (up is positive) until the feet touch. */
export function fallTime(height: number, vy: number): number {
  return (vy + Math.sqrt(vy * vy + 2 * G * Math.max(0, height))) / G;
}
