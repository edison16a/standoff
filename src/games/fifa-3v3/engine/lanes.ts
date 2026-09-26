import type { Athlete, MatchState } from "./types";

/** How many outfield players a team has: one to three, and the sides may differ. */
export function teamSize(state: MatchState, a: Athlete): number {
  let n = 0;
  for (const m of state.athletes) if (m.team === a.team) n++;
  return n;
}

/**
 * Which channel of the pitch a player keeps to, as -1, 0 or 1 across it.
 * The first player leads through the middle. With three, the other two
 * take a flank each; a pair plays one up and one behind, both central,
 * so a small team never leaves a whole side of the pitch empty.
 */
export function laneOf(state: MatchState, a: Athlete): -1 | 0 | 1 {
  if (a.slot === 0 || teamSize(state, a) < 3) return 0;
  return a.slot === 1 ? -1 : 1;
}
