import type { Stats } from "../roster";
import { clamp } from "./vec";

/**
 * What the two newer ratings, passing and defence, do in a game. Speed,
 * shooting and strength work where they always have (the run, the green
 * band, the contact); these are kept together so the picker's bars and
 * the play can be checked against each other. Every rating is 1 to 10,
 * and 5 plays like the game did before builds.
 */

/** How much faster than the base a pass flies: a Playmaker's zips in, a poor passer's floats. */
export function passSpeedScale(passing: number): number {
  return 0.88 + passing * 0.024;
}

/** How well a pass leads a runner, as a share of where they will be when it lands. */
export function passLead(passing: number): number {
  return clamp(0.66 + passing * 0.034, 0.6, 1);
}

/**
 * The chance a defender in the lane picks off a pass. Good hands and
 * quick feet on the defender make it likelier, a sharp passer less so.
 */
export function interceptChance(defender: Stats, passer: Stats): number {
  return clamp(0.02 + defender.defence * 0.006 + defender.speed * 0.003 - (passer.passing - 5) * 0.006, 0.004, 0.14);
}

/** Added to a steal's chance: quick hands on the defender, and a loose dribble on a weak passer. */
export function stealEdge(defender: Stats, holder: Stats): number {
  return (defender.defence - 5) * 0.03 + (5 - holder.passing) * 0.008;
}

/** How hard a defender's hand in the face counts, 1 for an average one. */
export function contestScale(defence: number): number {
  return 0.85 + defence * 0.03;
}

/** Taken off a dribble move's chance to beat a defender who reads the ball well. */
export function readEdge(defence: number): number {
  return (defence - 5) * 0.025;
}

/** How fast Guard's shadow keeps up, 1 for an average defender. */
export function guardScale(defence: number): number {
  return 0.8 + defence * 0.04;
}
