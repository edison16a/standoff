import { airborne } from "./athlete";
import { RIM_SPOT, rimDistance } from "./court";
import type { Match } from "./match";
import type { Athlete } from "./types";
import { dir2, dist2, type V2 } from "./vec";

/**
 * The stepback jumper, chosen by the situation: a shooter who rises
 * with a defender right in their chest first hops back off them to make
 * room, landing balanced and going straight up. Near the rim there is
 * no room to step into, and a shooter already running at the rim just
 * rises, so both stay straight up jumpers.
 */

/** A defender this close, in front, is in the shooter's chest. */
const TIGHT = 1.2;
/** The hop's speed, metres per second. Over the dip it covers most of a metre. */
const HOP = 3.1;

export function stepbackFor(m: Match, a: Athlete): V2 | null {
  if (rimDistance(a) < 3.2) return null;
  const toRim = dir2(a, RIM_SPOT);
  const speed = Math.hypot(a.vx, a.vz);
  if (speed > 2.2 && (a.vx * toRim.x + a.vz * toRim.z) / speed > 0.6) return null;
  const tight = m
    .opponents(a.team)
    .filter((d) => !airborne(d) && dist2(d, a) < TIGHT)
    .find((d) => {
      const to = dir2(a, d);
      return to.x * toRim.x + to.z * toRim.z > 0.35;
    });
  if (!tight) return null;
  // Straight back off the defender, bent a little away from the rim so it never drifts into the paint.
  const off = dir2(tight, a);
  const x = off.x * 0.7 - toRim.x * 0.3;
  const z = off.z * 0.7 - toRim.z * 0.3;
  const l = Math.hypot(x, z) || 1;
  return { x: (x / l) * HOP, z: (z / l) * HOP };
}
