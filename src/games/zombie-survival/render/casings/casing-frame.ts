import type { Point3 } from "../ballistics/arc";

/**
 * The ground frame a case flies in, in world space. `CasingBody` works
 * in a local frame where x points out of the ejection port, y is up and
 * z points back toward the shooter. This is that frame laid on the street.
 */
export interface CasingFrame {
  x: Point3;
  z: Point3;
}

/**
 * Builds the frame from the gun's right hand direction in the world. The
 * gun may be tipped up or rolled, but a case thrown out of the port flies
 * over level ground, so only the level part of "right" counts. Back
 * toward the shooter is then right crossed with up.
 */
export function casingFrame(right: Point3): CasingFrame {
  let x = right.x;
  let z = right.z;
  const length = Math.hypot(x, z);
  if (length < 1e-6) {
    // A gun pointing straight up or down has no level right: any heading will do.
    x = 1;
    z = 0;
  } else {
    x /= length;
    z /= length;
  }
  // (x, 0, z) crossed with (0, 1, 0) is (-z, 0, x).
  return { x: { x, y: 0, z }, z: { x: -z, y: 0, z: x } };
}

/**
 * The world position of a point `local` in the case's frame, whose
 * origin sits on the street under the ejection port.
 */
export function toWorld(frame: CasingFrame, origin: Point3, local: Point3, out: Point3): Point3 {
  out.x = origin.x + frame.x.x * local.x + frame.z.x * local.z;
  out.y = origin.y + local.y;
  out.z = origin.z + frame.x.z * local.x + frame.z.z * local.z;
  return out;
}

/** How long the drawn case takes to settle from the real port onto the shared ejection height. */
export const PORT_BLEND = 0.12;

/**
 * The share of the gap between the gun's real port and the shared
 * ejection height still added to a case `age` seconds out. The physics
 * starts every case at the same height so the sound's bounces line up,
 * but the gun on screen sits a little higher or lower. Fading the gap out
 * over the first moment starts the case exactly at the port and lands it
 * exactly when it is heard.
 */
export function portShare(age: number): number {
  return Math.max(0, 1 - age / PORT_BLEND);
}
