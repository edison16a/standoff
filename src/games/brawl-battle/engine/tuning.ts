/**
 * The numbers that make the game feel the way it does, in one place.
 * Moves count time in frames of the fixed step, like fighting games do,
 * so a move's data reads the same as its animation.
 */

/** The engine always runs at 60 steps a second, however fast the screen draws. */
export const FPS = 60;
export const STEP = 1 / FPS;

export const RULES = {
  stocks: 2,
  /** Frames of "Ready" then "Fight" before anyone can move. */
  countdown: 150,
  /** Frames the "Game!" moment holds before the results. */
  gameHold: 150,
};

export const MOVEMENT = {
  /** Frames crouched before a ground jump leaves, when an attack can still turn it into an up attack. */
  jumpSquat: 3,
  /** A short landing after any fall. */
  landLag: 4,
  /** Frames a platform ignores a fighter who dropped through it. */
  dropThrough: 14,
  /** How far a stick must lean to count as held that way, and to start a jump or a drop. */
  deadZone: 0.35,
  flick: 0.6,
};

export const LAUNCH = {
  /** How quickly a launch slows down, in metres per second each second. */
  decay: 30,
  /** Hitstun frames per metre per second of launch. */
  stunPerSpeed: 1.5,
  /** A launch this fast bounces off the floor instead of landing. */
  bounceSpeed: 14,
  bounce: 0.5,
  /** Sideways steering while launched, as a share of normal air control. */
  steer: 0.35,
  /** Hits within this many frames give the hitter credit for a fall. */
  creditFrames: 480,
};

export const HITSTOP = {
  base: 3,
  perDamage: 0.45,
  /** Heavy moves freeze a little longer, so they feel like they land. */
  heavy: 1.35,
  max: 22,
};

export const ULT = {
  /** Charge from the clock alone fills it in this many seconds. */
  fillSeconds: 45,
  /** Damage dealt that fills it on its own. */
  fillDamage: 110,
  /** Taking damage adds a little, so whoever is losing catches up. */
  takenShare: 0.25,
};

export const SHIELD = {
  /** Frames of holding down on the floor before the shield rises. */
  delay: 4,
  /** Share of the shield lost per point of damage blocked. */
  perDamage: 0.018,
  /** Lost each second it is held, and regained each second it is not. */
  drain: 0.12,
  regen: 0.18,
  /** Frames stuck behind the shield after a block. */
  stunBase: 4,
  stunPerDamage: 0.6,
  /** Push back from a block, in metres per second. */
  push: 5,
  /** Frames dizzy after the shield breaks. */
  breakStun: 120,
};

export const RESPAWN = {
  /** Frames between a fall and the platform appearing. */
  wait: 60,
  /** Frames the platform takes to come down, and the longest a fighter may stay on it. */
  descend: 60,
  hold: 150,
  /** How high above its stop the platform starts. */
  drop: 5,
  invincible: 120,
};

/** Presses are remembered this many frames, so one made a little early still comes out. */
export const BUFFER_FRAMES = 6;
