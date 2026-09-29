/** Where one racer stands: when they crossed the line, or how far they got. */
export interface RaceEntry {
  /** Song time the finish line was crossed, or null if not yet. */
  finishAt: number | null;
  /** How far along the level, in level units. Only counts while nobody has this racer beaten on time. */
  x: number;
}

/**
 * Places for a race, 1 for the leader. Anyone over the line is ahead of
 * anyone still running, and earlier beats later. Between runners the one
 * further along leads. Equal racers share a place, so a dead heat is two
 * firsts and the start shows no leader.
 */
export function racePlaces(entries: readonly RaceEntry[]): number[] {
  return entries.map((me) => 1 + entries.filter((other) => ahead(other, me)).length);
}

/** True if `a` is strictly ahead of `b`. */
function ahead(a: RaceEntry, b: RaceEntry): boolean {
  if (a.finishAt !== null && b.finishAt !== null) return a.finishAt < b.finishAt - 1e-9;
  if (a.finishAt !== null) return true;
  if (b.finishAt !== null) return false;
  return a.x > b.x + 1e-6;
}

/**
 * The winner of a race, as a 1 based slot, once someone is over the line.
 * Null before that, or on a dead heat, which a race at 240 steps a second
 * only gets from two presses on the same step all the way through.
 */
export function raceWinner(entries: readonly RaceEntry[]): number | null {
  if (!entries.some((e) => e.finishAt !== null)) return null;
  const places = racePlaces(entries);
  const firsts = places.flatMap((place, i) => (place === 1 ? [i + 1] : []));
  return firsts.length === 1 ? firsts[0]! : null;
}
