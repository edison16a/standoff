import { clamp, conjugate, DEG, dot, rotate, vec, type Quat, type Vec3 } from "@/games/kit/motion/math3d";

/**
 * Steering from the phone's tilt. The phone is held sideways and flat,
 * like a tray, and steering is rolling it: right end down steers right.
 *
 * The maths works from where "up" points in the phone's own frame. Its
 * part along the screen's left to right axis is the roll. Pitching the
 * phone toward your face turns around that same axis, so it never
 * changes the steering, and the compass heading plays no part at all,
 * so the gyro's slow drift cannot creep in.
 */

export interface Tilt {
  /** Radians, positive with the right end of the screen down. */
  roll: number;
  /** Radians, positive with the top of the screen raised. */
  pitch: number;
}

/**
 * The screen's right and up directions in the phone's own axes, for each
 * way the browser can have turned the page. At 90 degrees the phone is
 * turned anticlockwise, so its top edge is on the player's left.
 */
export function screenAxes(angle: number): { right: Vec3; up: Vec3 } {
  switch (((Math.round(angle / 90) * 90) % 360 + 360) % 360) {
    case 90:
      return { right: vec(0, -1, 0), up: vec(1, 0, 0) };
    case 180:
      return { right: vec(-1, 0, 0), up: vec(0, -1, 0) };
    case 270:
      return { right: vec(0, 1, 0), up: vec(-1, 0, 0) };
    default:
      return { right: vec(1, 0, 0), up: vec(0, 1, 0) };
  }
}

export function tiltOf(q: Quat, angle: number): Tilt {
  const up = rotate(conjugate(q), vec(0, 0, 1));
  const axes = screenAxes(angle);
  return {
    roll: -Math.asin(clamp(dot(up, axes.right), -1, 1)),
    pitch: Math.asin(clamp(dot(up, axes.up), -1, 1)),
  };
}

/** Roll that means full lock. About what turning a real wheel a quarter turn feels like. */
export const FULL_LOCK = 26 * DEG;
/** A small dead zone so a resting phone drives straight. */
const DEAD_ZONE = 2 * DEG;

/**
 * Steering from -1 to 1, measured from the roll captured at calibration.
 * The curve is gentle near the middle for fine corrections on straights
 * and firm near full lock for hairpins.
 */
export function steerFromRoll(roll: number, zero: number): number {
  const off = roll - zero;
  const mag = Math.max(0, Math.abs(off) - DEAD_ZONE) / (FULL_LOCK - DEAD_ZONE);
  const shaped = Math.min(1, 0.55 * mag + 0.45 * mag * mag);
  return Math.sign(off) * shaped;
}

/** Which way the page is turned, allowing for desktop browsers that report 0 in a wide window. */
export function screenAngle(): number {
  const reported = typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle : 0;
  const wide = typeof window !== "undefined" && window.innerWidth > window.innerHeight;
  if (wide && (reported === 0 || reported === 180)) return 90;
  return reported;
}
