import type { MatchState } from "./types";

/**
 * Test shortcuts for the host's hidden admin panel. They bend the match
 * the way play would, so the results and the ult can be checked without
 * fighting a whole match first.
 */

/**
 * Leaves one fighter standing, the first player who still has lives, so
 * the match ends on the next step exactly as a last KO would end it.
 */
export function skipToResults(state: MatchState): void {
  if (state.phase !== "ready" && state.phase !== "fight") return;
  // From the countdown too: the win is only checked while fighting.
  state.phase = "fight";
  const standing = state.fighters.filter((f) => f.stocks > 0);
  const keep = standing.find((f) => f.seat !== null) ?? standing[0];
  for (const f of standing) {
    if (f === keep) continue;
    f.stocks = 0;
    f.action = "out";
    f.frame = 0;
    state.eliminated.push({ id: f.id, frame: state.frame });
    state.events.push({ type: "eliminated", id: f.id });
  }
}

/** Fills every player's ult meter, so the ult can be tried at once. */
export function fillPlayerUlts(state: MatchState): void {
  for (const f of state.fighters) if (f.seat !== null && f.stocks > 0) f.ult = 1;
}
