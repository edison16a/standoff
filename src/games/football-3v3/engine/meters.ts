import { KICK } from "./tuning";

/**
 * The two kicking bars, as pure functions of time so the phone can draw
 * its own bar and the host can draw the same one without messages every
 * frame. The phone sends back where it stopped each.
 */

/** A triangle wave from 0 up to 1 and back over one period. */
function triangle(t: number, period: number): number {
  const p = (((t / period) % 1) + 1) % 1;
  return p < 0.5 ? p * 2 : 2 - p * 2;
}

/** The accuracy bar sweeping left to right and back: -1 is the left end, 0 the green centre. */
export function aimMeter(t: number): number {
  return triangle(t, KICK.aimPeriod) * 2 - 1;
}

/** The power bar rising and falling, 0 to 1. */
export function powerMeter(t: number): number {
  return triangle(t, KICK.powerPeriod);
}

/** Inside the green: a dead straight kick. */
export function inGreen(aim: number): boolean {
  return Math.abs(aim) <= KICK.green;
}

/** How far off line a kick goes, in radians: none in the green, growing to the worst at either end. */
export function aimError(aim: number): number {
  if (inGreen(aim)) return 0;
  const past = (Math.abs(aim) - KICK.green) / (1 - KICK.green);
  return Math.sign(aim) * KICK.maxError * Math.min(1, past);
}
