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
/**
 * Time from a jab being detected to the tip arriving. Long enough that a
 * quick defender who sees the lunge start can still parry it, and about
 * as long as a real lunge takes.
 */
export const JAB_IMPACT_MS = 220;
/** How long the lunge animation takes to extend and recover. */
export const JAB_DURATION_MS = 520;
/**
 * A parry that reaches the host this soon after a jab landed still saves
 * it. Phones are never quite in step over WiFi, and a parry the player saw
 * themselves make in time should count.
 */
export const PARRY_GRACE_MS = 80;
/**
 * After a parry that blocked nothing, the fencer cannot parry again for
 * this long. Without it, lifting the phone over and over would keep a
 * parry open all the time.
 */
export const PARRY_RECOVERY_MS = 250;
/**
 * A jab is aimed by where the blade pointed this long before it was
 * detected. By the time a chop is recognised it has already tipped the
 * phone down, and that dip is not where the player was aiming.
 */
export const AIM_LOOKBACK_MS = 110;
/** Two touches this close together cancel out, like an épée double. */
export const DOUBLE_WINDOW_MS = 60;
/** A parried attacker cannot strike again for this long. */
export const DEFLECTED_MS = 450;
/**
 * A tip more than this far off line (radians) misses even in range. It is
 * what makes the live sword angle matter and not just the jab trigger.
 */
export const OFF_TARGET_ANGLE = (70 * Math.PI) / 180;
/** Seconds counted down before each exchange. */
export const EN_GARDE_SECONDS = 3;
/**
 * Freeze after a touch, in engine time. The host plays the first part of
 * it in slow motion (see MatchDriver), so on screen it lasts about two
 * seconds, long enough to see the hit land and the burst go off.
 */
export const HALT_MS = 1400;
/** Freeze after a corps-à-corps or a double before play resumes. */
export const SHORT_HALT_MS = 900;
/** Two jabs this close together, one of them parried, count as a clash. */
export const CLASH_WINDOW_MS = 350;
