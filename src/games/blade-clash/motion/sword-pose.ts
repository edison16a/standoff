import { clamp, conjugate, cross, dot, rotate, scale, sub, vec, wrapAngle, type Quat, type Vec3 } from "@/games/kit/motion/math3d";

const EARTH_UP = vec(0, 0, 1);
/** Past this elevation the swing of the blade stops meaning anything. */
const MAX_PITCH = (80 * Math.PI) / 180;

/**
 * The guard pose everything is measured against, captured while the
 * player holds the phone the way they mean to hold their sword.
 */
export interface Calibration {
  /** The phone's own direction (device frame) that was level and pointing forward. */
  blade: Vec3;
  /** The phone's own direction (device frame) that was straight up. */
  up: Vec3;
  /** Heading of forward in the earth frame, radians. */
  heading: number;
}

/** Angles relative to the calibrated guard, in radians. */
export interface SwordPose {
  pitch: number;
  yaw: number;
  roll: number;
}

/**
 * Takes the current pose as guard, whatever the grip. People hold a phone
 * "like a sword" in two ways: flat with the top edge forward, or upright
 * with the back of the phone facing forward. Whichever of those two edges
 * is closer to level is taken as pointing at the opponent, and the exact
 * forward direction becomes the blade. So tilting the phone up raises the
 * sword on screen, however it is held.
 */
export function calibrate(q: Quat): Calibration {
  const top = rotate(q, vec(0, 1, 0));
  const back = rotate(q, vec(0, 0, -1));
  const pointing = Math.abs(top.z) <= Math.abs(back.z) ? top : back;
  const heading = Math.atan2(pointing.x, pointing.y);
  const forward = vec(Math.sin(heading), Math.cos(heading), 0);
  const inverse = conjugate(q);
  return { blade: rotate(inverse, forward), up: rotate(inverse, EARTH_UP), heading };
}

/**
 * Reads the blade straight off the live orientation. This is what makes
 * the on screen sword follow the real hand: no integration, no drift, just
 * where the calibrated blade direction points right now.
 */
export function swordPose(q: Quat, calibration: Calibration): SwordPose {
  const blade = rotate(q, calibration.blade);
  const up = rotate(q, calibration.up);
  return {
    pitch: clamp(Math.asin(clamp(blade.z, -1, 1)), -MAX_PITCH, MAX_PITCH),
    yaw: wrapAngle(Math.atan2(blade.x, blade.y) - calibration.heading),
    roll: twist(blade, up),
  };
}

/** How far the grip has turned around the blade, compared with keeping its top up. */
function twist(blade: Vec3, up: Vec3): number {
  const level = sub(EARTH_UP, scale(blade, dot(EARTH_UP, blade)));
  const turned = sub(up, scale(blade, dot(up, blade)));
  return Math.atan2(dot(cross(level, turned), blade), dot(level, turned));
}
