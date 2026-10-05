import type { Athlete } from "./athlete-types";
import { clamp } from "./vec";

/**
 * What each rating does in a match, in one place so every build's edge
 * can be read and tested. Each takes a player's ratings as 0 to 1 and
 * returns a multiplier or an amount the match formulas use. Ratings run
 * from about 0.55 to 0.98, and 0.75 is an ordinary player. Finishing,
 * pace, dribbling and strength are read straight from the ratings where
 * they are used (shot-error.ts, athlete.ts, skills.ts, tackle.ts).
 */
type Rated = Pick<Athlete, "attrs">;

/** Shot power: how much faster than the bar alone a shot leaves the boot. */
export function strikePace(a: Rated): number {
  return 0.88 + 0.18 * a.attrs.power;
}

/**
 * Passing: how far off a pass lands, as metres per metre of pass, before
 * the random direction. A 96 passer is nearly exact; a 55 one drifts.
 */
export function passError(a: Rated): number {
  return 0.16 * (1 - a.attrs.passing) ** 1.2;
}

/** Passing: how firmly a ground pass arrives, so it beats the man in the lane sooner. */
export function passZip(a: Rated): number {
  return 0.8 + 0.4 * a.attrs.passing;
}

/** Vision: how much of a running mate's run the pass leads, so it drops in their stride. */
export function leadShare(a: Rated): number {
  return 0.45 + 0.5 * a.attrs.vision;
}

/** Vision: how far away a mate can be and still be picked out by the stick. */
export function passRange(a: Rated): number {
  return 0.72 + 0.4 * a.attrs.vision;
}

/**
 * Tackling and strength: the tackler's edge in a slide, a steal or a
 * standing challenge, added to the chance of winning the ball.
 */
export function tackleEdge(a: Rated, victim: Rated): number {
  return 0.45 * (a.attrs.tackling - 0.75) + 0.25 * (a.attrs.strength - victim.attrs.strength);
}

/** Tackling: a clean tackler gives away fewer fouls. Multiplies the foul chance. */
export function foulRisk(a: Rated): number {
  return clamp(1.3 - 0.5 * a.attrs.tackling, 0.75, 1.1);
}

/** Reach: how far a steal pokes from the body. Multiplies the base reach. */
export function stealReach(a: Rated): number {
  return 0.82 + 0.3 * a.attrs.reach;
}

/** Reach: how far either side of a shot's line a body or a leg still gets there. Multiplies the lane. */
export function blockLane(a: Rated): number {
  return 0.72 + 0.4 * a.attrs.reach;
}

/** Reach: extra metres a loose ball can be from the boots and still be taken. */
export function takeRange(a: Rated): number {
  return 0.18 * a.attrs.dribbling + 0.16 * (a.attrs.reach - 0.6);
}

/** Reflexes: how quickly a body gets in a shot's way. Multiplies the chance of a block. */
export function blockSharpness(a: Rated): number {
  return 0.55 + 0.6 * a.attrs.reflexes;
}

/** Reflexes and dribbling: the chance a hard ball bounces off a heavy first touch. */
export function heavyTouch(a: Rated): number {
  return clamp(0.6 - 0.25 * a.attrs.dribbling - 0.25 * a.attrs.reflexes, 0.05, 0.5);
}

/** Reflexes: how long a steal or a jump leaves a player before the next. Multiplies the wait. */
export function recovery(a: Rated): number {
  return 1.3 - 0.45 * a.attrs.reflexes;
}
