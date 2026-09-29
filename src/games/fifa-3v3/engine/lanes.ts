import { attackSign } from "../teams";
import type { Athlete, MatchState } from "./types";

/** How many outfield players a team has: one to three, and the sides may differ. */
export function teamSize(state: MatchState, a: Athlete): number {
  let n = 0;
  for (const m of state.athletes) if (m.team === a.team) n++;
  return n;
}

/**
 * Which channel of the pitch a player keeps to, as -1, 0 or 1 across z.
 * The Striker (slot 0) leads through the middle. With three, the Left
 * wing takes the flank on their own left as they attack and the Right
 * wing the other, so the two sides' wingers face each other. A pair
 * plays one up and one behind, both central, so a small team never
 * leaves a whole side of the pitch empty.
 */
export function laneOf(state: MatchState, a: Athlete): -1 | 0 | 1 {
  if (a.slot === 0 || teamSize(state, a) < 3) return 0;
  // Attacking along +x, the left hand is toward -z.
  const left = -attackSign(a.team) as -1 | 1;
  return a.slot === 1 ? left : (-left as -1 | 1);
}
