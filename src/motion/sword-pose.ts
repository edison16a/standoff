import { clamp, rotate, vec, wrapAngle, type Quat, type Vec3 } from "./math3d";

/**
 * How the player holds the phone: gripped like a sword handle, top edge
 * pointing at the opponent. So the blade runs along the phone's y axis
 * and the screen's x axis tells us how the wrist is turned.
 */
const BLADE_AXIS = vec(0, 1, 0);
const WRIST_AXIS = vec(1, 0, 0);

/** Past this elevation the heading of the blade stops meaning anything. */
const MAX_PITCH = (80 * Math.PI) / 180;

/** The resting guard pose we measure everything against. */
export interface Calibration {
  heading: number;
  elevation: number;
  roll: number;
}

/** Angles relative to the calibrated guard, in radians. */
export interface SwordPose {
  pitch: number;
  yaw: number;
  roll: number;
}

interface RawAngles {
  heading: number;
  elevation: number;
  roll: number;
}

/**
 * Reads the blade direction straight off the orientation quaternion. This
 * is what makes the on screen sword follow the real hand: no integration,
 * no drift, just where the phone points right now.
 */
function rawAngles(q: Quat): RawAngles {
  const blade = rotate(q, BLADE_AXIS);
  const wrist = rotate(q, WRIST_AXIS);
  return {
    heading: Math.atan2(blade.x, blade.y),
    elevation: Math.asin(clamp(blade.z, -1, 1)),
    // How far the wrist axis dips below level, which is the twist of the grip.
    roll: Math.asin(clamp(-wrist.z, -1, 1)),
  };
}

export function calibrate(q: Quat): Calibration {
  return rawAngles(q);
}

export function swordPose(q: Quat, calibration: Calibration): SwordPose {
  const raw = rawAngles(q);
  return {
    pitch: clamp(raw.elevation - calibration.elevation, -MAX_PITCH, MAX_PITCH),
    yaw: wrapAngle(raw.heading - calibration.heading),
    roll: wrapAngle(raw.roll - calibration.roll),
  };
}

/**
 * The strip direction in earth coordinates: level, pointing wherever the
 * blade pointed at calibration. Jabs, parries and footwork are all
 * measured along this line, so a thrust counts the same whether the tip is
 * high or low, and the player can circle the blade without it reading as
 * a step.
 */
export function stripAxis(calibration: Calibration): Vec3 {
  return vec(Math.sin(calibration.heading), Math.cos(calibration.heading), 0);
}
