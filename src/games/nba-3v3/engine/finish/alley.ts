import { standingReach } from "../athlete";
import { RIM_SPOT, rimDistance } from "../court";
import type { Match } from "../match";
import { SHOT } from "../tuning";
import type { Athlete } from "../types";
import { dir2, dist2 } from "../vec";

/**
 * The alley oop. A pass to a teammate already running hard at the rim
 * with nobody on him goes up as a lob to his hands high over his head;
 * he catches it on the way and goes straight up into the finish, which
 * the selection makes an alley oop dunk when he has the room.
 */

/** Whether a pass to `to` is a lob for an alley oop: cutting at the rim, close, at speed, with space. */
export function alleyFits(m: Match, to: Athlete): boolean {
  const d = rimDistance(to);
  const speed = Math.hypot(to.vx, to.vz);
  if (d > 4.6 || d < 1.4 || speed < 3) return false;
  const toRim = dir2(to, RIM_SPOT);
  if ((to.vx * toRim.x + to.vz * toRim.z) / speed < 0.7) return false;
  return m.opponents(to.team).every((o) => dist2(o, to) > 1.6);
}

/** How high the lob comes in: the hands up high, just under full reach, where he takes it on the run. */
export function alleyHeight(to: Athlete): number {
  return standingReach(to) - 0.15;
}

/**
 * The lob is caught: remember it for the selection, and if he is still
 * in range going at the rim he goes up with it in the same motion.
 */
export function catchAlley(m: Match, a: Athlete, finish: (m: Match, a: Athlete) => void): void {
  m.alleyLob = null;
  m.alleyCatch = { id: a.id, at: m.time };
  if (rimDistance(a) < SHOT.driveRange + 0.3) finish(m, a);
}
