import { rimDistance } from "../court";
import { RIM } from "../tuning";
import type { Athlete } from "../types";
import { dir2, type V2 } from "../vec";

/**
 * Which way from the rim the finish happens. A player coming from under
 * the glass swings round to finish in front of it, so the body and the
 * ball never pass through the backboard.
 */
export function finishSide(a: V2, d = rimDistance(a)): V2 {
  const raw = d > 0.2 ? dir2(RIM, a) : { x: 0, z: 1 };
  if (raw.z >= 0.45) return raw;
  const x = Math.abs(raw.x) < 0.05 ? 0.6 : raw.x;
  const l = Math.hypot(x, 0.45);
  return { x: x / l, z: 0.45 / l };
}

/** Which side of the rim a baseline drive comes from, and so which way it carries on under it. */
function baselineSide(a: Athlete): number {
  if (Math.abs(a.vx) > 1.2) return -Math.sign(a.vx);
  return Math.sign(a.x - RIM.x) || 1;
}

/**
 * A reverse goes up on the far side of the rim from where the drive came
 * in, just in front of the glass, or on the side the stick sends it
 * (`cross`, the sign along x).
 */
export function underSpot(a: Athlete, cross?: 1 | -1): V2 {
  const x = cross ?? -baselineSide(a);
  return { x: RIM.x + x * 0.7, z: RIM.z + 0.42 };
}

/** How far a step through ends out from the rim, and across to the side. */
const THROUGH = { out: 0.75, across: 0.9 } as const;

/** A step through finishes across in front of the rim on its `side` (+ the driver's right facing the rim). */
export function throughSpot(a: V2, side: 1 | -1): V2 {
  const away = finishSide(a);
  return { x: RIM.x + away.x * THROUGH.out + away.z * THROUGH.across * side, z: RIM.z + away.z * THROUGH.out - away.x * THROUGH.across * side };
}
