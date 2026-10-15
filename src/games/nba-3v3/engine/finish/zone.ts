import { RIM_SPOT, rimDistance } from "../court";
import { floaterFits } from "../floater";
import type { Match } from "../match";
import { BOARD, SHOT } from "../tuning";
import type { Athlete } from "../types";
import { dir2 } from "../vec";

/**
 * How a ball handler is coming at the rim right now, and whether Shoot
 * here is a finish rather than a jumper: driving at it close in, under
 * the glass, right at it, or on a floater run from the edge of the paint.
 * The press reads it (`actions.ts`), and so do the phone and the keys,
 * to show the finish rules and keep the jumper's meter off.
 */
export interface RunIn {
  distance: number;
  speed: number;
  heading: number;
  driving: boolean;
  underGlass: boolean;
  floater: boolean;
}

export function runIn(m: Match, a: Athlete): RunIn {
  const distance = rimDistance(a);
  const speed = Math.hypot(a.vx, a.vz);
  const to = dir2(a, RIM_SPOT);
  const heading = speed > 0.1 ? (a.vx * to.x + a.vz * to.z) / speed : 0;
  const driving = distance < SHOT.driveRange && speed > 1.6 && heading > 0.55;
  // Under the glass there is no jumper to take, so it becomes a reverse layup.
  const underGlass = a.z < BOARD.face + 0.3 && Math.abs(a.x - RIM_SPOT.x) < 2.8;
  // Running hard at the rim from the edge of the paint, or with a big man waiting, it goes up early and soft.
  const floater = !underGlass && floaterFits(m, a, distance, speed, heading);
  return { distance, speed, heading, driving, underGlass, floater };
}

/** Shoot here is a finish at the rim, not a jumper. */
export function atRim(r: RunIn): boolean {
  return r.floater || r.driving || r.underGlass || r.distance < SHOT.closeRange;
}
