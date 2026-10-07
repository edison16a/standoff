import { airborne } from "../athlete";
import { RIM_SPOT, rimDistance } from "../court";
import { pressJump } from "../defend";
import type { Match } from "../match";
import type { Athlete } from "../types";
import { dir2, dist2 } from "../vec";
import { jumpTarget } from "./style";

/** Running at least this fast toward the rim, this close to it, Guard is a leap rather than a shadow. */
const LEAP_SPEED = 2.2;
const LEAP_RANGE = 4.5;

/**
 * Guard pressed on the run to the post as the shot or the drive goes
 * up: there is nobody to shadow any more, so he leaps with both hands
 * up instead (the `run` jump, see `style.ts`). Anywhere else Guard is
 * the shadow it always is.
 */
export function guardLeap(m: Match, a: Athlete): void {
  if (a.action.kind !== "none" || airborne(a)) return;
  const speed = Math.hypot(a.vx, a.vz);
  if (speed < LEAP_SPEED || rimDistance(a) > LEAP_RANGE) return;
  const toRim = dir2(a, RIM_SPOT);
  if ((a.vx * toRim.x + a.vz * toRim.z) / speed < 0.4) return;
  const t = jumpTarget(m, a);
  const b = m.ball;
  const shot = b.mode === "flight" && b.flightKind === "shot";
  const act = t?.action;
  const going = !!act && (act.kind === "drive" || (act.kind === "shoot" && !act.released));
  if (shot || (going && t && dist2(a, t) < 3.2)) pressJump(m, a);
}
