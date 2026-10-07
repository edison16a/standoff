import { TACKLE } from "../../engine/tuning";
import type { DownCause } from "../../engine/types";
import { keyed, mix, neutral, over, smooth, type Pose } from "./pose";

/**
 * Hitting the turf after a dive and getting back up, and the plain fall
 * for anything down outside a preset (tackle/ has the tackles and the
 * misses). The figure grounds every pose, so a body pitched flat simply
 * lies on the grass.
 */
const base = neutral();

/** Launched flat out, arms stretched ahead, legs trailing. */
const DIVE_AIR = over(base, {
  lift: 0.5, pitch: 1.35, neckX: -1.0, spineX: -0.1,
  shLX: -2.9, shRX: -2.9, elL: -0.15, elR: -0.15, shLZ: 0.15, shRZ: 0.15,
  hipLX: 0.2, hipRX: 0.3, kneeL: 0.4, kneeR: 0.7,
});
/** Face down on the grass, arms out ahead. */
const PRONE = over(base, {
  pitch: 1.52, neckX: -0.7,
  shLX: -2.7, shRX: -2.5, elL: -0.4, elR: -0.6, shLZ: 0.45, shRZ: 0.5,
  hipLX: 0.05, hipRX: 0.1, kneeL: 0.3, kneeR: 0.5, hipLZ: 0.1, hipRZ: 0.15,
});
/** Pushed up on the hands and one knee, on the way up. */
const KNEEL = over(base, {
  pitch: 0.75, neckX: -0.6, spineX: 0.2,
  shLX: -1.1, shRX: -0.3, elL: -0.2, elR: -0.9,
  hipLX: -1.6, kneeL: 1.4, hipRX: -0.6, kneeR: 2.1, hipLZ: 0.15, hipRZ: 0.1,
});
/** Flat on the back after a hard hit, knees up. */
const SUPINE = over(base, {
  pitch: -1.5, neckX: 0.5,
  shLX: 0.4, shRX: 0.6, shLZ: 0.8, shRZ: 0.9, elL: -0.6, elR: -0.4,
  hipLX: -0.5, hipRX: -0.2, kneeL: 1.0, kneeR: 0.5, hipLZ: 0.1, hipRZ: 0.12,
});
export function divePose(t: number, dur: number): Pose {
  const u = t / Math.max(0.01, dur);
  const load = over(base, { pitch: 0.4, hipLX: -0.8, hipRX: -0.5, kneeL: 1.2, kneeR: 0.9, shLX: 0.6, shRX: 0.6 });
  return keyed([[0, load], [0.12, DIVE_AIR], [0.62, over(DIVE_AIR, { lift: 0.25 })], [0.85, PRONE]], u);
}

/**
 * Lying on the ground for the action's length, then the last
 * TACKLE.getUp seconds rolling to the knees and standing. A ball
 * carrier planted by the hit lands on the back; everyone else ends up
 * face down after their dive.
 */
export function downPose(t: number, dur: number, cause: DownCause, seed: number): Pose {
  const lying = cause === "tackled" && seed % 2 === 0 ? SUPINE : PRONE;
  const fall = smooth(t / 0.25);
  // The fall itself: from upright to the ground in a quarter of a second.
  // A dive already ends flat on the turf, so it starts there rather than standing back up to fall.
  const falling = cause === "dive" ? lying : mix(over(base, { pitch: cause === "tackled" ? 0.4 : 0.9 }), lying, fall);
  const up = t - (dur - TACKLE.getUp);
  if (up <= 0) return settle(falling, t, seed);
  const u = up / TACKLE.getUp;
  // From the back, roll over first; then hands and knee, then up.
  const start = lying === SUPINE ? mix(SUPINE, PRONE, smooth(u / 0.3)) : PRONE;
  return keyed([[0, start], [0.45, KNEEL], [1, base]], u);
}

/** A little movement while down: a breath and a shake of the head. */
function settle(p: Pose, t: number, seed: number): Pose {
  return over(p, { neckY: Math.sin(t * 1.3 + seed) * 0.15, spineX: p.spineX + Math.sin(t * 2.4 + seed) * 0.02 });
}
