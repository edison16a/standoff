import { isDown } from "./body";
import type { Match } from "./match";
import { canThrow, receivers, throwTo } from "./passing";
import { acrossOf, PLAY_RUNNERS } from "./playbook/runners";
import type { Athlete } from "./types";

/**
 * The QB's four throw buttons, one per runner of the play in his colour
 * and number (playbook/colours.ts). A tap throws to that runner: the
 * engine leads him if he is moving, throws at him if he stands, and the
 * rush still pushes the ball off (aim.ts, throw-error.ts). The play's
 * call does not limit the throw: on a run call the QB may still throw
 * to any of the four, as well as pitch.
 */

/**
 * Who each button throws to, left to right as the QB looks downfield,
 * the way the card numbers them. A play without a card (the filmed
 * game) numbers whoever can catch, the same way.
 */
export function throwSlots(m: Match, qb: Athlete): number[] {
  const play = m.play;
  if (play && play.runners.length > 0) return play.runners.slice(0, PLAY_RUNNERS);
  return receivers(m, qb)
    .sort((a, b) => acrossOf(m, a.z) - acrossOf(m, b.z))
    .slice(0, PLAY_RUNNERS)
    .map((a) => a.id);
}

/** Whether the button for `id` would throw now: the QB can throw, and the runner is a teammate on his feet. */
export function canThrowTo(m: Match, qb: Athlete, id: number): boolean {
  const target = m.athlete(id);
  return !!target && target.team === qb.team && target.id !== qb.id && !isDown(target) && canThrow(m, qb);
}

/** One button for each slot: whether it can throw right now, for the phone to light up. */
export function slotsOpen(m: Match, qb: Athlete): boolean[] {
  const slots = throwSlots(m, qb);
  return Array.from({ length: PLAY_RUNNERS }, (_, i) => slots[i] !== undefined && canThrowTo(m, qb, slots[i]!));
}

/** A throw button tapped: the throw to that slot's runner starts, or nothing when it cannot go. */
export function throwToSlot(m: Match, qb: Athlete, slot: number): boolean {
  // Letting go ends the highlight, whether or not the throw can go.
  if (m.play) m.play.hot = null;
  const id = throwSlots(m, qb)[slot];
  if (id === undefined || !canThrowTo(m, qb, id)) return false;
  qb.aim = null;
  return throwTo(m, qb, id);
}
