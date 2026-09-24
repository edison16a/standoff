import type { BuzzKind } from "../protocol";

/**
 * Buzz patterns per event, in milliseconds. `navigator.vibrate` works on
 * Android; iPhones ignore it, and the sound on the big screen carries
 * the moment instead.
 */
const PATTERNS: Record<BuzzKind, number[]> = {
  hit: [140, 60, 90],
  pickup: [18],
  boost: [40],
  lap: [30, 50, 30],
  bump: [25],
  finish: [60, 60, 60, 60, 160],
};

export function buzz(event: BuzzKind): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(PATTERNS[event]);
}
