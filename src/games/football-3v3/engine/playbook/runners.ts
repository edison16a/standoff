import { formationSpot } from "../formation";
import type { Match } from "../match";
import { jobOf } from "../support/roster";
import type { Athlete, TeamId } from "../types";
import type { RunnerKind } from "./deal";

/** Runners a play draws routes for: the two runners, the deep threat and a wing. */
export const PLAY_RUNNERS = 4;

/** Across the field as the QB looks downfield: negative is his left. */
export const acrossOf = (m: Match, z: number) => (z - m.drive.ballZ) * m.sign;

/**
 * The team's four runners for a play call, left to right as the QB
 * looks downfield from his throw formation, so the numbers 1 to 4 read
 * across the card the way the field does. The two runners and the deep
 * threat always run; a wing fills the last place, from the side with
 * fewer runners on it, so the play spreads both ways.
 */
export function playRunners(m: Match, team: TeamId): Athlete[] {
  const mine = m.athletes.filter((a) => a.team === team);
  const picked = mine.filter((a) => a.role === "runner" || a.deep);
  const spot = (a: Athlete) => acrossOf(m, formationSpot(a, m.drive, "throw").z);
  const lean = picked.reduce((n, a) => n + Math.sign(spot(a)), 0);
  const wings = mine
    .filter((a) => a.role === "support" && !a.deep && jobOf(a) !== "tackle")
    .sort((a, b) => (lean >= 0 ? spot(a) - spot(b) : spot(b) - spot(a)));
  for (const w of wings) if (picked.length < PLAY_RUNNERS) picked.push(w);
  return picked.sort((a, b) => spot(a) - spot(b));
}

/** What each runner is in the formation, for the routes he may get. `back` is the runner taking the pitch on a run call. */
export const kindOf = (a: Athlete, back: number | null): RunnerKind =>
  a.id === back ? "back" : a.role === "runner" ? "wide" : a.deep ? "deep" : "wing";
