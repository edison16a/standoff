/**
 * The match moves through these phases. The host owns the machine, the
 * phones only mirror it so they can show the right screen.
 *
 * lobby: players join, calibrate and pick characters.
 * countdown: both fighters on their marks, counting down to the fight.
 * live: the fight itself, with no stops until someone runs out of health.
 * finish: the final hit, the first part in slow motion.
 * matchOver: the winner screen, then a rematch or the menu.
 * paused: a phone dropped mid fight and we are waiting for it.
 */
export const MATCH_PHASES = ["lobby", "countdown", "live", "finish", "matchOver", "paused"] as const;

export type MatchPhase = (typeof MATCH_PHASES)[number];
