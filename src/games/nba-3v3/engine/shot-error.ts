import type { Rng } from "./rng";
import { clamp } from "./vec";
import { CALIBRATION, SPREADS, type Family } from "./shot-calibration";

/**
 * How far off a release is. Every shot is aimed at the same place a
 * good shooter aims, and the hand puts it off by an error drawn from a
 * bell curve: long or short a little more than left or right, as real
 * shooters miss. The spread comes from the chance the shot model gives
 * (the meter, the distance, the shooting rating, the contest), read
 * back through a table of how often the ball physics drops a shot for
 * each spread. So the iron and the glass decide every shot, and over a
 * game the make rates come out where the shot model puts them.
 */

/** Depth errors run this much wider than side to side. */
export const LONG_SPREAD = 1.25;

/** A bell curve with unit spread, cut off past three and a half. */
export function normal(rng: Rng): number {
  return (rng() + rng() + rng() + rng() - 2) * Math.sqrt(3);
}

/** The make rate row for a family, at the shot's distance for jumpers. */
function row(family: Family, distance: number): readonly number[] {
  if (family !== "jumper") return CALIBRATION[family];
  const rows = CALIBRATION.jumperRows;
  const ds = CALIBRATION.jumperAt;
  if (distance <= ds[0]!) return rows[0]!;
  for (let i = 1; i < ds.length; i++) {
    if (distance > ds[i]!) continue;
    const u = (distance - ds[i - 1]!) / (ds[i]! - ds[i - 1]!);
    return rows[i - 1]!.map((p, k) => p + (rows[i]![k]! - p) * u);
  }
  return rows[rows.length - 1]!;
}

/** The spread that makes a shot of this family drop `chance` of the time. */
export function spreadFor(family: Family, chance: number, distance = 0): number {
  const p = row(family, distance);
  const want = clamp(chance, 0.01, 0.999);
  if (want >= p[0]!) return SPREADS[0]!;
  for (let i = 1; i < p.length; i++) {
    if (want < p[i]!) continue;
    const u = (p[i - 1]! - want) / Math.max(1e-6, p[i - 1]! - p[i]!);
    return SPREADS[i - 1]! + (SPREADS[i]! - SPREADS[i - 1]!) * u;
  }
  // Rarer than the table reaches: a wild heave, spread wider still.
  const last = SPREADS[SPREADS.length - 1]!;
  return last * Math.min(2, p[p.length - 1]! / want);
}

/** The miss in metres along the line of the shot (long is past the aim) and across it. */
export function drawError(rng: Rng, spread: number): { long: number; side: number } {
  return { long: normal(rng) * spread * LONG_SPREAD, side: normal(rng) * spread };
}
