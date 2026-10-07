import type { TrackKey } from "./spec";

/**
 * The ball's path through the hands for each kind of finish, in the
 * body's own frame (see `TrackKey`). The gathers bring the ball up off
 * the last bounce into both hands; the air parts carry it to where the
 * reach for the rim begins. The release point itself is worked out from
 * the arm (`ball-track.ts`), so every path ends in a real hand.
 */

const k = (s: number, f: number, x: number, y: number, two = true): TrackKey => ({ s, f, x, y, two });

/** Off the bounce at the hip into both hands, tight at the chest through the steps, at the chin on leaving the floor. */
const TWO_STEP: TrackKey[] = [k(0.35, 0.3, 0.14, 0.56), k(0.75, 0.28, 0.08, 0.66), k(1, 0.26, 0.1, 0.76)];

export const LAYUP_TRACKS = {
  /** Up in front at full stretch. */
  front: [...TWO_STEP, k(1.35, 0.3, 0.16, 0.95, false)],
  /** Carried under the rim and up over the head on the far side. */
  reverse: [...TWO_STEP, k(1.3, 0.12, 0.18, 0.98, false)],
  /** Swung across the body with the first step, back with the second. */
  sweep: [k(0.4, 0.3, -0.16, 0.58), k(0.8, 0.3, 0.2, 0.62), k(1, 0.28, 0.18, 0.74), k(1.35, 0.3, 0.18, 0.95, false)],
  /** Shown high on the pump fake, brought down, then swung through low under the arms. */
  fake: [k(0.25, 0.3, 0.1, 0.62), k(0.45, 0.24, 0.04, 1.0), k(0.62, 0.3, 0.08, 0.62), k(1, 0.32, 0.26, 0.6), k(1.3, 0.32, 0.3, 0.82, false)],
  /** Low on the hand side, away from the hands, then scooped up underneath. */
  low: [k(0.35, 0.3, 0.26, 0.52), k(0.75, 0.26, 0.36, 0.46, false), k(1, 0.3, 0.4, 0.48, false), k(1.3, 0.4, 0.34, 0.62, false)],
  /** Already high: a quick one step up. */
  high: [k(0.3, 0.26, 0.1, 0.72), k(1, 0.25, 0.14, 0.9, false)],
  /** Tucked tight into the chest through a spin. */
  tuck: [k(0.3, 0.22, 0.06, 0.64), k(0.9, 0.2, 0.04, 0.64), k(1, 0.24, 0.1, 0.76), k(1.35, 0.28, 0.16, 0.95, false)],
  /** Held high and away from the defender, the body between them. */
  shield: [k(0.4, 0.26, 0.2, 0.62), k(1, 0.2, 0.3, 0.8), k(1.3, 0.15, 0.32, 1.0, false)],
} satisfies Record<string, TrackKey[]>;

/** A dunk's load: the ball swung down past the knees on the last step to throw the arms up with. */
const LOAD: TrackKey[] = [k(0.35, 0.3, 0.1, 0.58), k(0.78, 0.34, 0.02, 0.46), k(1, 0.3, 0.02, 0.74)];

export const DUNK_TRACKS = {
  /** Both hands overhead, straight up to the rim. */
  twoUp: [...LOAD, k(1.35, 0.25, 0, 1.12)],
  /** Both hands cocked right back behind the head. */
  hammer: [...LOAD, k(1.45, -0.12, 0, 1.15)],
  /** One hand, cocked behind the head on the way up. */
  tomahawk: [...LOAD, k(1.4, -0.1, 0.15, 1.12, false)],
  /** Cocked all the way back, the body arched like a bow. */
  cockback: [...LOAD, k(1.45, -0.25, 0.2, 1.0, false)],
  /** One hand, round in a full circle: down in front, back by the hip, over the top. */
  windmill: [...LOAD, k(1.2, 0.35, 0.3, 0.85, false), k(1.4, 0.25, 0.38, 0.52, false), k(1.6, -0.25, 0.35, 0.75, false), k(1.8, -0.1, 0.25, 1.15, false)],
  /** Overhead, then taken back over the head facing away from the rim. */
  reverse: [...LOAD, k(1.4, 0.1, 0, 1.1)],
  /** Scooped up from low on the hand side. */
  scoop: [...LOAD, k(1.25, 0.35, 0.3, 0.6, false), k(1.6, 0.4, 0.2, 1.0, false)],
  /** Pulled down to the waist at the top of the jump, then up and in. */
  clutch: [...LOAD, k(1.4, 0.3, 0, 0.55), k(1.7, 0.3, 0, 1.0)],
  /** One hand up in front. */
  one: [...LOAD, k(1.35, 0.3, 0.15, 1.05, false)],
  /** Caught high, one step, straight up. */
  catch: [k(0.3, 0.24, 0.05, 0.9), k(1, 0.26, 0.05, 1.0), k(1.3, 0.25, 0.1, 1.12, false)],
  /** Off a jump stop on both feet: the ball low between the knees on the load. */
  stop: [k(0.3, 0.3, 0.08, 0.6), k(0.7, 0.32, 0, 0.42), k(1, 0.3, 0, 0.72), k(1.35, 0.25, 0, 1.12)],
  /** Off the board: brought down to the chin and straight back up with both hands. */
  board: [k(0.3, 0.24, 0.04, 0.72), k(1, 0.26, 0, 0.92), k(1.35, 0.25, 0, 1.12)],
} satisfies Record<string, TrackKey[]>;
