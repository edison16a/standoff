import type { Match } from "./match";
import { QB_PACE } from "./tuning";
import type { Athlete } from "./types";
import { clamp } from "./vec";

/**
 * The QB as a passer and as a runner. Until he chooses to run he is a
 * slow passer who can shuffle while he throws; pressing Run gives up the
 * throw (and the pitch) for the rest of the play and he moves like any
 * runner, with the runner's juke and dive.
 */

/** True once this play's QB has become a runner. */
export function qbRunning(m: Match): boolean {
  return m.play?.qbRun ?? false;
}

/** The QB may turn runner once, live, with the ball in hand and his feet free. */
export function canRun(m: Match, a: Athlete): boolean {
  const play = m.play;
  if (m.phase !== "live" || !play || play.qbRun || play.passed || play.pitched) return false;
  return a.role === "qb" && a.team === m.offense && m.carrier()?.id === a.id && (a.action.kind === "none" || a.action.kind === "juke");
}

/** Turns the QB into the runner for the rest of the play. */
export function startRun(m: Match, a: Athlete): boolean {
  if (!canRun(m, a)) return false;
  m.play!.qbRun = true;
  m.play!.target = null;
  a.aim = null;
  return true;
}

/** How much of a normal top speed a player has: all of it, except the offense's QB while he is still a passer. */
export function paceOf(m: Match, a: Athlete): number {
  if (a.role !== "qb" || a.team !== m.offense || qbRunning(m) || m.play?.intercepted) return 1;
  const t = m.play?.sinceSnap ?? 0;
  return QB_PACE.early + (QB_PACE.late - QB_PACE.early) * clamp(t / QB_PACE.ramp, 0, 1);
}
