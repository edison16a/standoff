/**
 * The match moves through these phases. The host owns the machine, the
 * phones only mirror it so they can show the right screen.
 *
 * lobby: players join and pick characters.
 * enGarde: the countdown before an exchange, everyone resets.
 * live: the exchange itself.
 * halt: a short freeze after a touch, the first part in slow motion.
 * matchOver: someone reached the winning score.
 * paused: a phone dropped mid match and we are waiting for it.
 */
export const MATCH_PHASES = ["lobby", "enGarde", "live", "halt", "matchOver", "paused"] as const;

export type MatchPhase = (typeof MATCH_PHASES)[number];

/** Best of three means the first to two touches wins. */
export const TOUCHES_TO_WIN = 2;
