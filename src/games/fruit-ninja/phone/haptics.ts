import type { BuzzEvent } from "../protocol";

/**
 * Buzz patterns per event, in milliseconds. `navigator.vibrate` works on
 * Android. iPhones ignore it, so there the big screen's sound carries
 * the feedback.
 */
const PATTERNS: Record<BuzzEvent, number[]> = {
  slice: [14],
  hit: [30],
  rare: [20, 30, 20, 30, 60],
  combo: [15, 25, 15, 25, 15],
  bomb: [220, 60, 120],
};

export function buzz(event: BuzzEvent): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(PATTERNS[event]);
}
