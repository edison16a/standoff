import type { Stats } from "../builds";
import { clamp } from "./vec";

/**
 * What each rating does in a game, in one place, so the numbers on the
 * phone's bars are the numbers that play. Speed, agility and power also
 * shape running in body.ts; these are the rest. Every factor is 1 at an
 * average rating of 5, so tuning.ts keeps describing the average player.
 */

/** Catch reach: the radius round the body a pass can be caught in. Hands 10 reaches a fifth farther. */
export function catchReach(s: Stats): number {
  return 0.8 + s.hands * 0.04;
}

/**
 * Reading the throw: how close to the catch spot a defender must stand
 * to jump the route, and how near the ball's path they pick it off.
 * Cover 10 reads a quarter wider than average.
 */
export function coverReach(s: Stats): number {
  return 0.75 + s.cover * 0.05;
}

/** A computer defender's chance to knock down a pass going past, scaled by cover. */
export function swatFactor(s: Stats): number {
  return 0.6 + s.cover * 0.08;
}

/** How long between jukes: agile players juke again sooner. 0.84 of the average at agility 9. */
export function jukeRecovery(s: Stats): number {
  return 1.2 - s.agility * 0.04;
}

/** The QB's kicking leg follows the arm rating: a strong thrower kicks long. */
export function kickLeg(s: Stats): number {
  return s.arm;
}

/**
 * The chance a ball carrier shrugs off a tackle that reached him: only
 * the stronger man breaks one, a little more each point of power he has
 * over the tackler, and never more than two in five.
 */
export function breakChance(carrier: Stats, tackler: Stats): number {
  return clamp((carrier.power - tackler.power + 1) * 0.07, 0, 0.4);
}
