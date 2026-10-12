import { distanceAt, GRAVITY, type RoundSpec } from "../../ballistics/rounds";

/** A point in the world, so the maths here runs without three.js. */
export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/**
 * How much the drawn arc exaggerates gravity. Over a street a real round
 * falls only millimetres, which no screen can show. Three times the true
 * arc still reads as a slight curve on a long miss and stays invisible
 * on a close hit, which is what the eye expects.
 */
export const ARC_GAIN = 3;

/**
 * How far above the straight line from muzzle to hit the round is, `t`
 * seconds into a flight of `total` seconds. The engine's hit is a straight
 * raycast, so the drawn round must start at the muzzle and end exactly on
 * the hit. A thrown body that meets both ends under gravity rises
 * g t (T - t) / 2 above the chord: it leaves pointing a hair high and
 * drops onto the target, which is how a zeroed rifle shoots. Past the
 * end (a miss flying on) the same parabola carries it below the line.
 */
export function arcLift(t: number, total: number, gain = ARC_GAIN): number {
  return gain * 0.5 * GRAVITY * t * (total - t);
}

/**
 * Where a round is `t` seconds after leaving `from` on its way to `to`,
 * `length` metres off, arriving after `total` seconds. Drag slows it, so
 * it covers the first metres faster than the last; `distanceAt` gives
 * how far along the line it has got, and the arc lifts it off the line.
 */
export function roundPoint(spec: RoundSpec, from: Point3, to: Point3, length: number, total: number, t: number, out: Point3): Point3 {
  const s = length > 0 ? distanceAt(spec, t) / length : 1;
  const lift = arcLift(t, total);
  out.x = from.x + (to.x - from.x) * s;
  out.y = from.y + (to.y - from.y) * s + lift;
  out.z = from.z + (to.z - from.z) * s;
  return out;
}

/**
 * The time at the tail of a round's motion blur. A camera shutter open
 * for `shutter` seconds smears a fast round into a streak as long as the
 * distance it covers in that time. The tail can never start behind the
 * muzzle, so a round just fired shows a shorter streak.
 */
export function tailTime(t: number, shutter: number): number {
  return Math.max(0, t - shutter);
}

/**
 * The frame a round is drawn at: a round that would land between two
 * frames is still drawn once, sitting on its target with its blur behind
 * it, so even a rifle round across the street is seen.
 */
export function drawTime(t: number, total: number, drawn: boolean): number {
  return drawn ? t : Math.min(t, total);
}
