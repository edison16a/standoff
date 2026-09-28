/**
 * The match moves through these phases. The host owns the machine, the
 * phones only mirror it so they can show the right screen.
 *
 * lobby: players join, calibrate and pick characters.
 * countdown: both fighters on their marks, counting down to the fight.
 * live: the fight itself, until a slash lands.
 * point: a slash landed. Slow motion, then both fighters back to their marks.
 * finish: the winning point, the first part in slow motion.
 * matchOver: the winner screen, then a rematch or the menu.
 * paused: a phone dropped mid fight and we are waiting for it.
 */
export const MATCH_PHASES = ["lobby", "countdown", "live", "point", "finish", "matchOver", "paused"] as const;

export type MatchPhase = (typeof MATCH_PHASES)[number];
