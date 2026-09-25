/** One fixed simulation step, in seconds. The host steps at 60 per second whatever the screen does. */
export const STEP = 1 / 60;

export const RULES = {
  health: 100,
  roundsToWin: 5,
  /** Seconds of round banner and countdown before the shooting starts. */
  countdown: 3,
  /** Seconds the round's result shows before the next one. */
  roundHold: 3.5,
  /** Seconds the match winner shows before the results screen. */
  matchHold: 4,
  /**
   * After this many seconds a round is called for the side with more
   * health left. Pressure makes it rare; this only stops a round that
   * somehow stalls from running forever.
   */
  roundLimit: 150,
} as const;

/**
 * A fighter's hit boxes, the same for every character so the draw is
 * fair. Heights are metres above the ground.
 */
export const BODY = {
  radius: 0.3,
  headRadius: 0.14,
  standTop: 1.5,
  standHead: 1.64,
  crouchTop: 0.92,
  crouchHead: 1.04,
  /** How far the fighter's eyes and gun sit above the ground, standing and crouched. */
  standEye: 1.58,
  crouchEye: 0.98,
} as const;

/** Seconds the movement brain waits between fresh plans, unless something forces one sooner. */
export const PLAN_EVERY = 0.5;

/** How much the hunt tightens over a round: none at `start`, full by `full` seconds. */
export const PRESSURE = { start: 12, full: 70 } as const;
