import type { BuzzKind } from "../protocol";

/**
 * Buzz patterns per event, in milliseconds. `navigator.vibrate` works on
 * Android; iPhones ignore it, and the big screen's sound carries the
 * moment instead.
 */
const PATTERNS: Record<BuzzKind, number[]> = {
  kick: [45],
  pass: [18],
  ball: [12, 30, 12],
  tackle: [70],
  tackled: [120, 40, 60],
  goal: [80, 60, 80, 60, 220],
  conceded: [260],
  whistle: [30, 40, 30],
  win: [100, 60, 100, 60, 100, 60, 400],
  lose: [400],
};

export function buzz(event: BuzzKind): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(PATTERNS[event]);
}
