/**
 * The numbers that set how the game plays. The arena is measured in world
 * units with the screen always 10 units tall, so every speed here means
 * the same thing on any screen shape.
 */

/** Half the screen's height in world units. The width follows the window. */
export const HALF_HEIGHT = 5;

/** Downward pull on everything in flight, units per second squared. */
export const GRAVITY = 9.5;

/**
 * The blade only cuts above this speed, in units per second. About half a
 * screen height per second: a flick cuts, a slow hover does not.
 */
export const SLICE_SPEED = 5.5;

/** A new swipe (and its whoosh) starts when the blade gets this fast. */
export const SWIPE_SPEED = 11;

/** How quickly the measured blade speed follows the real one, in seconds. */
export const SPEED_SMOOTHING_S = 0.03;

/** Extra reach around the blade, so grazing the edge of a fruit counts. */
export const BLADE_REACH = 0.1;

/** A blade that has not moved for this long starts a fresh path, so it never cuts across a gap. */
export const BLADE_GAP_S = 0.15;

/** A struck big fruit ignores the blade this long, so one pass is one hit. */
export const HIT_COOLDOWN_S = 0.16;

/** Slices this close together belong to one swipe for a combo. */
export const COMBO_WINDOW_S = 0.38;

/** A combo needs at least this many fruit. */
export const COMBO_MIN = 3;

/** How long a bomb leaves the blade that hit it unable to cut. */
export const STUN_S = 1.4;

export const COUNTDOWN_S = 3;

/** After time runs out, fruit already in the air may still be sliced this long. */
export const ENDING_S = 2.5;

/** The last stretch of a round, when fruit comes faster. */
export const FRENZY_S = 10;

export const POINTS = {
  /** Each hit on a big fruit before it bursts. */
  hit: 5,
  /** The last hit on a big fruit. */
  burst: 40,
  bomb: -30,
  /** Per fruit in a combo of three or more. */
  comboPerFruit: 10,
} as const;
