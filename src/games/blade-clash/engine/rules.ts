/**
 * Fixed rules of the duel. Unlike the tuning values these never change
 * during play, they describe the world. Distances are metres, times are
 * milliseconds. x runs along the fighting line with 0 in the middle, y is
 * up from the floor, and z is across the line.
 */

/** How far either way the fighters may walk from the middle. */
export const LINE_HALF_LENGTH = 5;
/** Each fighter starts this far from the middle. */
export const START_X = 1.75;
/** Bodies never get closer than this, centre to centre. */
export const MIN_GAP = 1.05;
/** Walking speed with Forward or Back held. */
export const WALK_SPEED = 1.7;
/** Hits a fighter can take. The last one ends the fight. */
export const MAX_HEALTH = 5;
/** Seconds counted down before the fight starts. */
export const COUNTDOWN_SECONDS = 3;
/**
 * Engine time from the final hit to the winner screen. The host plays the
 * start of it in slow motion, so on screen it lasts a good while longer.
 */
export const FINISH_MS = 1600;

/** A hit fighter flinches for this long. */
export const HIT_REACTION_MS = 420;
/** And cannot be hit again meanwhile, so one swing is one hit. */
export const HIT_GUARD_MS = 480;
/** A hit pushes the fighter who took it back along the line by this much. */
export const HIT_PUSHBACK = 0.3;
/** How fast they slide back, in m/s, so the push is a quick shove rather than a jump. */
export const PUSHBACK_SPEED = 3;
/** After a clash, the blades cannot clash again for this long. */
export const CLASH_COOLDOWN_MS = 220;
/** Both fighters stagger for this long after a clash. */
export const STAGGER_MS = 380;

/** A blade tip moving faster than this makes a whoosh. */
export const SWING_SPEED = 5;
/** And has to slow below this before it can make another. */
export const SWING_REARM_SPEED = 2.5;
