import type { Cutscene } from "./events";

/** The run's rhythm: health, walking pace and how long each pause lasts. */

export const MAX_HEALTH = 100;
/** Metres per second the team moves between fights: a run, so the next fight is never far off. */
export const WALK_SPEED = 7.4;
/** Seconds between two footfalls at that pace. */
export const STEP_SECONDS = 0.3;
/** Metres per second in the chopper, from the roof to the docks. */
export const FLY_SPEED = 10;
/** Seconds the team stops after a fight, just long enough to reload before moving on. */
export const CLEAR_SECONDS = 1.5;
/** After the fights that end in a story beat, the team stops a little longer to take stock. */
export const STORY_CLEAR_SECONDS = 4;
export const CUTSCENE_SECONDS: Record<Cutscene, number> = { chopper: 8, escape: 16 };
/** Health found at each checkpoint. */
export const CHECKPOINT_HEAL = 15;
/** A retry never starts a fight with less than this, so a bad checkpoint is not a dead end. */
export const RETRY_FLOOR = 50;
