import { finishStoppage } from "./count";
import type { Match } from "./match";
import { other, type FighterId } from "./types";

/**
 * Ends a fight at once with a stoppage for `winner`, scored on the
 * cards so far. Only the host's hidden test shortcuts use it, to reach
 * the winner's ceremony without boxing four rounds.
 */
export function stopFight(match: Match, winner: FighterId): boolean {
  if (match.phase === "over") return false;
  match.stoppage = { fighter: other(winner), method: "TKO" };
  finishStoppage(match);
  return true;
}
