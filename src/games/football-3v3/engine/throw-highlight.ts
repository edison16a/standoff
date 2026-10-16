import type { Match } from "./match";
import { canThrowTo, throwSlots } from "./throw-targets";
import type { Athlete } from "./types";

/**
 * The QB's finger resting on a throw button before he lets go: that
 * runner lights up on the big screen, and nothing else changes. It lives
 * on the play, so every play starts clear, and it only ever names a
 * throw that could go right now. The moment it could not (the ball
 * thrown or pitched, a sack, a turnover, the whistle, the runner down)
 * it is dropped for good, and the phone has to point again.
 */

/** The runner a slot's throw would go to now, or null when that throw cannot go. */
function openRunner(m: Match, qb: Athlete, slot: number): number | null {
  const id = throwSlots(m, qb)[slot];
  return id !== undefined && canThrowTo(m, qb, id) ? id : null;
}

/** The QB's finger moved onto a throw button, or off them all (null). A slot that cannot throw lights nothing. */
export function highlightSlot(m: Match, qb: Athlete, slot: number | null): void {
  const play = m.play;
  if (!play) return;
  play.hot = slot !== null && openRunner(m, qb, slot) !== null ? slot : null;
}

/** The runner lit up now, by id, or null. */
export function hotRunner(m: Match): number | null {
  const play = m.play;
  if (!play || play.hot === null) return null;
  return openRunner(m, m.qbOf(m.offense), play.hot);
}

/** Each step: a highlight whose throw can no longer go is dropped, so it never lights up again by itself. */
export function dropStaleHighlight(m: Match): void {
  if (m.play && m.play.hot !== null && hotRunner(m) === null) m.play.hot = null;
}
