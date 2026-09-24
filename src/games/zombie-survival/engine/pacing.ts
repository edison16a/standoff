import type { Cutscene } from "./events";

/** The run's rhythm: health, walking pace and how long each pause lasts. */

export const MAX_HEALTH = 100;
/** Metres per second the team moves between fights: a hurried jog, not a stroll. */
export const WALK_SPEED = 6.2;
/** Seconds between two footfalls at that pace. */
export const STEP_SECONDS = 0.34;
/** Seconds the team stops after a fight, just long enough to reload before moving on. */
export const CLEAR_SECONDS = 2.5;
/** After the fights that end in a story beat, the team stops longer to take stock. */
export const STORY_CLEAR_SECONDS = 6.5;
export const CUTSCENE_SECONDS: Record<Cutscene, number> = { chopper: 12, escape: 16 };
/** Health found at each checkpoint. */
export const CHECKPOINT_HEAL = 15;
/** A retry never starts a fight with less than this, so a bad checkpoint is not a dead end. */
export const RETRY_FLOOR = 50;
