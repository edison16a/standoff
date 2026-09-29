import { statsOf } from "./body";
import { clampToWorld } from "./field";
import type { Rng } from "./rng";
import { ON_THE_RUN } from "./tuning";
import type { Athlete } from "./types";
import { clamp, type V2 } from "./vec";

/**
 * How loose a throw is, from 0 (feet set) to 1 (flat out). It comes from
 * how fast the QB is moving at the release, so standing still is always
 * clean and a throw on the run is a gamble. A strong arm steadies it a
 * little.
 */
export function looseness(a: Athlete): number {
  const speed = Math.hypot(a.vx, a.vz);
  const run = clamp((speed - ON_THE_RUN.still) / (ON_THE_RUN.full - ON_THE_RUN.still), 0, 1);
  const arm = 1.15 - statsOf(a).arm * 0.03;
  return clamp(run * arm, 0, 1);
}

/** Moves the spot a loose throw comes down on: the looser and the longer, the farther off. */
export function missSpot(spot: V2, from: V2, loose: number, rng: Rng): V2 {
  if (loose <= 0) return spot;
  const length = Math.hypot(spot.x - from.x, spot.z - from.z);
  const spread = loose * (ON_THE_RUN.missBase + length * ON_THE_RUN.missPerMetre);
  return clampToWorld({ x: spot.x + rng.gauss(spread), z: spot.z + rng.gauss(spread) });
}
