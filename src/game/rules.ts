/**
 * Fixed rules of the strip. Unlike the tuning values these do not change
 * during play, they describe the world. Distances are metres, times are
 * milliseconds, and x runs along the strip with 0 at the centre line.
 */

/** A real strip is 14 m long. */
export const STRIP_HALF_LENGTH = 7;
/** Each fencer starts this far from the centre, like the en garde lines. */
export const EN_GARDE_X = 2;
/** Top walking speed when the controller is pushed all the way out. */
export const MAX_SPEED = 1.8;
/** Centre to centre distance a lunging jab can reach. */
export const REACH = 2.4;
/** Closer than this and the bodies collide: corps-à-corps. */
export const MIN_GAP = 0.9;
/** How far apart corps-à-corps puts the fencers back. */
export const RESET_GAP = 3.2;
/** Time from a jab being detected to the tip arriving. */
export const JAB_IMPACT_MS = 140;
/** How long the lunge animation takes to extend and recover. */
export const JAB_DURATION_MS = 420;
/** Two touches this close together cancel out, like an épée double. */
export const DOUBLE_WINDOW_MS = 60;
/** A parried attacker cannot strike again for this long. */
export const DEFLECTED_MS = 450;
/**
 * A tip more than this far off line (radians) misses even in range. It is
 * what makes the live sword angle matter and not just the jab trigger. It
 * is generous, because a chop down tips the phone a little as it goes.
 */
export const OFF_TARGET_ANGLE = (75 * Math.PI) / 180;
/** Seconds counted down before each exchange. */
export const EN_GARDE_SECONDS = 3;
/** Freeze after a touch before the replay starts. */
export const HALT_MS = 1100;
/** Freeze after a corps-à-corps or a double before play resumes. */
export const SHORT_HALT_MS = 900;
/** Two jabs this close together, one of them parried, count as a clash. */
export const CLASH_WINDOW_MS = 350;
