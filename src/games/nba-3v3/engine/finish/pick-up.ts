/**
 * The tap rules at the rim for a person. Near the rim Shoot does not
 * throw a jumper: the press picks up the dribble, and what the thumb does
 * next decides the finish. The three never clash:
 *
 * - Hold: Shoot still down `hold` seconds after the press is a layup,
 *   and the stick picks which one (see `steer-layup.ts`).
 * - Double tap: let go within `hold`, then press again within `double`
 *   of the first press, and it is a dunk attempt.
 * - One quick tap and nothing more is a layup too, once the double tap
 *   window has closed.
 *
 * A press held past `hold` is already a layup, so a late second press
 * never turns it into a dunk. Away from the rim Shoot is the jumper as
 * always: hold it and let go in the green.
 */
export const FINISH_TAPS = {
  hold: 0.17,
  double: 0.3,
} as const;

export type FinishCall = "dunk" | "layup";

/** Shoot pressed at the rim, not read yet: when it went down, and when it came up if it has. */
export interface PickUp {
  at: number;
  up: number | null;
}

/** Shoot pressed again while the first press is still being read: a double tap if the first was a quick tap and this is in time. */
export function pressAgain(p: PickUp, now: number): FinishCall | null {
  return p.up !== null && now - p.at <= FINISH_TAPS.double ? "dunk" : null;
}

/** Shoot let go. A hold already read as a layup keeps that; a quick tap waits for a second one. */
export function letGo(p: PickUp, now: number): void {
  if (p.up === null) p.up = now;
}

/** What the press has become by `now`, or null while it could still be either. */
export function settle(p: PickUp, now: number): FinishCall | null {
  if (p.up === null) return now - p.at >= FINISH_TAPS.hold ? "layup" : null;
  return now - p.at > FINISH_TAPS.double ? "layup" : null;
}
