import { standingReach } from "./athlete";
import { RIM_SPOT, rimDistance } from "./court";
import { RIM } from "./tuning";
import type { Athlete, LayupKind } from "./types";
import { dir2, type V2, type V3 } from "./vec";

/**
 * How a drive ends at the rim, read from where the driver is and who is
 * in the way. Under the rim, or cutting across it along the baseline,
 * there is no front of the rim to lay it on, so the ball goes up the
 * far side as a reverse, the back to the basket. Into a defender's body
 * it is a contact layup, a little further out and a little lower. The
 * rest are layups off the fingers in front of the rim.
 */

/**
 * Which way from the rim the finish happens. A player coming from under
 * the glass swings round to finish in front of it, so the body and the
 * ball never pass through the backboard.
 */
export function finishSide(a: V2, d = rimDistance(a)): V2 {
  const raw = d > 0.2 ? dir2(RIM_SPOT, a) : { x: 0, z: 1 };
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

export function layupKind(a: Athlete, contact: boolean): LayupKind {
  const off = a.x - RIM.x;
  const under = a.z < RIM.z + 0.55 && Math.abs(off) < 2.8;
  // Along the baseline and across the front of the rim, fast, toward the other side.
  const across = a.z < RIM.z + 1.3 && Math.abs(off) < 2 && a.vx * off < -1.2;
  if (under || across) return "reverse";
  return contact ? "contact" : "finger";
}

/** Where the feet leave the floor for the finish. */
export function finishSpot(a: Athlete, dunk: boolean, layup: LayupKind | null): V2 {
  if (layup === "reverse") {
    const side = baselineSide(a);
    return { x: RIM.x - side * 0.5, z: RIM.z + 0.38 };
  }
  const away = finishSide(a);
  const stop = dunk ? 0.42 : layup === "contact" ? 0.9 : 0.72;
  return { x: RIM.x + away.x * stop, z: RIM.z + away.z * stop };
}

/** Where the ball leaves the hand: at full stretch toward the rim, or back over the head on a reverse. */
export function releaseHand(a: Athlete, layup: LayupKind): V3 {
  const toward = layup === "reverse" ? 0.3 : 0.25;
  const lift = layup === "contact" ? -0.15 : layup === "reverse" ? -0.1 : -0.05;
  return { x: a.x + (RIM.x - a.x) * toward, y: a.y + standingReach(a) + lift, z: a.z + (RIM.z - a.z) * toward };
}
