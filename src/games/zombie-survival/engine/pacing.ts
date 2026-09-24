import type { Cutscene } from "./events";

/** The run's rhythm: health, walking pace and how long each pause lasts. */

export const MAX_HEALTH = 100;
/** Metres per second the team walks between fights. */
export const WALK_SPEED = 3.8;
/** Seconds on the checkpoint summary before the team moves on. */
export const CLEAR_SECONDS = 6.5;
export const CUTSCENE_SECONDS: Record<Cutscene, number> = { chopper: 12, escape: 16 };
/** Health found at each checkpoint. */
export const CHECKPOINT_HEAL = 15;
/** A retry never starts a fight with less than this, so a bad checkpoint is not a dead end. */
export const RETRY_FLOOR = 50;
