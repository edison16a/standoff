import type { Match } from "./match";
import type { Athlete } from "./types";

/**
 * Who each phone steers right now. A phone owns one athlete (`seat`) for
 * the whole game, but like Madden it takes over the receiver or the back
 * it gives the ball to when that player is a computer one, so a person
 * playing alone is never left watching. The phone's own player goes to
 * the computer until the next play lines up, and then every phone steers
 * its own player again. A phone never takes a player another person owns.
 */

/** The athlete a phone steers now: its own, or the one it took the ball to. */
export function steered(m: Match, seat: number): Athlete | null {
  return m.athletes.find((a) => a.pilot === seat) ?? null;
}

/** People steering a player right now, with the seat each is steered from. */
export function piloted(m: Match): { seat: number; athlete: Athlete }[] {
  return m.athletes.flatMap((a) => (a.pilot !== null && !a.auto ? [{ seat: a.pilot, athlete: a }] : []));
}

const still = (a: Athlete) => {
  a.move = { x: 0, z: 0 };
  a.aim = null;
  a.guard = null;
};

/**
 * The ball went from `from` to `to`. When a person threw or pitched it
 * to a computer teammate, that person takes the teammate over, keeping
 * the stick they hold so the run carries on, and the computer plays the
 * passer. Returns whether control moved.
 */
export function handOver(m: Match, from: Athlete, to: Athlete): boolean {
  const seat = from.pilot;
  if (seat === null || from.auto || to.team !== from.team || to.seat !== null || to.pilot !== null) return false;
  to.pilot = seat;
  to.auto = false;
  to.move = { ...from.move };
  to.aim = null;
  to.guard = null;
  from.pilot = null;
  from.auto = true;
  still(from);
  m.emit({ type: "control", seat, from: from.id, to: to.id });
  return true;
}

/** Each phone back on its own player, for a new play. Phones still away stay with the computer. */
export function restoreControl(m: Match): void {
  for (const a of m.athletes) {
    if (a.pilot === a.seat) continue;
    a.pilot = a.seat;
    a.auto = a.seat === null || m.away.has(a.seat);
    still(a);
  }
}

/** A phone dropped or came back: the computer plays whichever player it steers meanwhile. */
export function setAway(m: Match, seat: number, away: boolean): void {
  if (away) m.away.add(seat);
  else m.away.delete(seat);
  const body = steered(m, seat);
  if (!body) return;
  body.auto = away;
  still(body);
}
