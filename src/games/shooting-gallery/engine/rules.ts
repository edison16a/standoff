/** The numbers that set the pace of a round. */

/** Round lengths the host can pick on the computer, in seconds. */
export const ROUND_CHOICES = [20, 30, 45] as const;
export type RoundSeconds = (typeof ROUND_CHOICES)[number];
export const DEFAULT_ROUND: RoundSeconds = 20;

export function isRoundChoice(value: number): value is RoundSeconds {
  return (ROUND_CHOICES as readonly number[]).includes(value);
}

/** Seconds of "3, 2, 1" before the first shot counts. */
export const COUNTDOWN_S = 3;

/**
 * The BB gun has to be pumped between shots. It also stops a player from
 * winning by hammering the button instead of aiming. The phone greys its
 * button a little longer than this, so no press is ever silently dropped.
 */
export const COOLDOWN_S = 0.3;

/** How long a hit target takes to fall flat, and when its clack sounds. */
export const FALL_S = 0.42;

/** Targets speed up by this fraction over a round, so the end is the busiest part. */
export const SPEED_RAMP = 0.35;

/** The last few seconds tick out loud. */
export const FINAL_SECONDS = 5;

/** A golden duck is rare: this chance per duck, at most this many a round. */
export const GOLDEN_CHANCE = 0.05;
export const GOLDEN_MAX = 2;

/** Pop up targets rise and sink this quickly. */
export const POP_TIME_S = 0.32;

/** Fallen targets that do not ride off stage are cleared after this long. */
export const CLEAR_AFTER_S = 1.4;
