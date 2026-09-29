import type { BuzzKind } from "../protocol";

/**
 * Buzz patterns per event, in milliseconds. `navigator.vibrate` works on
 * Android; iPhones ignore it, and the big screen's sound carries the
 * moment instead.
 */
const PATTERNS: Record<BuzzKind, number[]> = {
  hike: [25],
  throw: [18],
  catch: [14, 30, 14],
  tackle: [80],
  tackled: [140, 40, 70],
  touchdown: [80, 60, 80, 60, 240],
  conceded: [260],
  whistle: [30, 40, 30],
  kick: [50],
  pick: [60, 40, 60, 40, 120],
  win: [100, 60, 100, 60, 100, 60, 400],
  lose: [400],
};

export function buzz(event: BuzzKind): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(PATTERNS[event]);
}
