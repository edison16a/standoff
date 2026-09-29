import type { Match } from "../match";
import { startPitch } from "../run-play";
import type { Athlete } from "../types";
import { headFor } from "./goal";

/**
 * A computer QB on a run call: takes the snap, gives ground for a beat
 * while the back gets going, then pitches it to him. Standing still, so
 * the pitch goes where he meant it.
 */
export function pitchRead(m: Match, qb: Athlete): void {
  const t = m.play?.sinceSnap ?? 0;
  if (t >= qb.bot.readAt) {
    qb.bot.goal = { x: 0, z: 0 };
    startPitch(m, qb);
    return;
  }
  headFor(qb, { x: qb.x - m.sign * 1.5, z: qb.z }, 1.5);
}
