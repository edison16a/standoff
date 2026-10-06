import { qRotate, qUnrotate, type Quat } from "./quat";
import type { V3 } from "../vec";

/**
 * The football as a solid: a prolate spheroid 28 cm long and 17 cm
 * across, 0.42 kg. Its long axis is body +y and the laces face body +z.
 * The moments of inertia are those of a leather shell round a bladder:
 * a little easier to spin about the long axis than to flip end over end,
 * which is why a spiral is a gyroscope and a kick tumbles steadily.
 */
export const BALL_SHAPE = {
  mass: 0.42,
  /** Half the length (long axis) and the widest radius, metres. */
  half: 0.14,
  radius: 0.085,
  /** kg m^2 about the long axis and about any axis across it. */
  iLong: 0.002,
  iCross: 0.0031,
} as const;

export const GRAVITY = 9.81;

/** The long axis in the body frame. */
export const LONG: Readonly<V3> = { x: 0, y: 1, z: 0 };

/** The long axis in the world, for an orientation. */
export const longAxis = (q: Quat): V3 => qRotate(q, LONG);

/** Squared semi axis along each body direction: radius across, half the length along. */
const R2 = BALL_SHAPE.radius * BALL_SHAPE.radius;
const H2 = BALL_SHAPE.half * BALL_SHAPE.half;

/**
 * How far the ball's surface reaches from its centre toward world unit
 * direction n: its half thickness seen along n. Side on it is the
 * radius, nose on it is half the length.
 */
export function extent(q: Quat, n: V3): number {
  const b = qUnrotate(q, n);
  return Math.sqrt(R2 * b.x * b.x + H2 * b.y * b.y + R2 * b.z * b.z);
}

/** The point on the surface furthest along world unit direction n, as an offset from the centre. */
export function support(q: Quat, n: V3): V3 {
  const b = qUnrotate(q, n);
  const h = Math.sqrt(R2 * b.x * b.x + H2 * b.y * b.y + R2 * b.z * b.z);
  if (h < 1e-12) return { x: 0, y: 0, z: 0 };
  return qRotate(q, { x: (R2 * b.x) / h, y: (H2 * b.y) / h, z: (R2 * b.z) / h });
}

/** World angular velocity from world angular momentum: w = R I^-1 R^T L. */
export function omegaOf(q: Quat, L: V3): V3 {
  const b = qUnrotate(q, L);
  return qRotate(q, { x: b.x / BALL_SHAPE.iCross, y: b.y / BALL_SHAPE.iLong, z: b.z / BALL_SHAPE.iCross });
}

/** Inverse inertia applied to a world vector, for contact impulses. */
export const invInertia = omegaOf;

/** World angular momentum for a world angular velocity: L = R I R^T w. */
export function momentumOf(q: Quat, w: V3): V3 {
  const b = qUnrotate(q, w);
  return qRotate(q, { x: b.x * BALL_SHAPE.iCross, y: b.y * BALL_SHAPE.iLong, z: b.z * BALL_SHAPE.iCross });
}
