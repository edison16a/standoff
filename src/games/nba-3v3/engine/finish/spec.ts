/**
 * The shape of a hand made finish at the rim. Every layup and dunk is
 * a preset: authored footwork, timing, a ball path through the hands
 * and a release, which the selection logic (`select.ts`) picks before
 * the gather starts. The physics then flies the ball from the hand.
 */

/** The footwork before leaving the floor. */
export type Steps =
  /** The plain two step gather: right, long left, up. */
  | "two"
  /** A first step one way, then a long step across the other. */
  | "euro"
  /** Stop and pump fake, then step through under the defender. */
  | "fake"
  /** A full spin on the gather, away from the defender. */
  | "spin"
  /** A hard two foot jump stop, then up off both feet. */
  | "stop"
  /** Off one step, early, before the defence is set. */
  | "one";

/**
 * A point the ball passes through in the body's own frame. `s` runs 0
 * to 1 through the gather and 1 to 2 through the flight to the release.
 * `f` is metres ahead of the body, `x` metres toward the finishing hand,
 * `y` the height above the soles as a share of the player's height.
 * `two` says both hands are on it.
 */
export interface TrackKey {
  s: number;
  f: number;
  x: number;
  y: number;
  two: boolean;
}

/** A body turn: so many turns in the gather or in the air, turning toward the drive's `side`. */
export interface Turn {
  turns: number;
  during: "gather" | "air";
}

export interface FinishSpec {
  /** Seconds from the start of the gather to the feet leaving the floor. */
  gather: number;
  /** Seconds from takeoff to the release or the slam. */
  air: number;
  /** How far from the rim the body is as the ball goes, metres. */
  stop: number;
  /** How far the body ends up off the straight line, metres, toward the drive's `side` (away from the defender). */
  shift: number;
  steps: Steps;
  turn: Turn | null;
  /** Faces the rim the whole way, or the way of travel (a reverse along the baseline). */
  yaw: "rim" | "path";
  /** The ball through the hands, from the pick up to the start of the reach. */
  track: readonly TrackKey[];
  /** Where on `s` the track starts easing into the release point. */
  blendFrom: number;
}

/** A layup's release, as a reach from the shoulder: up, toward the rim and out to the hand side, and how much of the arm. */
export interface Reach {
  up: number;
  rim: number;
  side: number;
  ext: number;
}

export interface LayupSpec extends FinishSpec {
  /** Body height at the release, metres. */
  peak: number;
  release: Reach;
  /** How the ball goes up: straight at the ring, off the glass, high and soft, or the glass when the angle allows. */
  family: "layup" | "bank" | "floater" | "reverse" | "auto";
  /** How high the arc peaks over the ring, metres. */
  apex: number;
  /** Backspin range, radians a second. */
  backspin: readonly [number, number];
  /** 0 to 1: how much of a defender's chance to block it the finish takes away. */
  evade: number;
}

export interface DunkSpec extends FinishSpec {
  /** One hand on the ball at the slam, or both. */
  hands: 1 | 2;
  /** The chance this dunk hangs on the rim after the slam. */
  hang: number;
  /** How hard it goes down, 0 to 1, for the sounds and the rim. */
  power: number;
}
