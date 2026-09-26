import type { FeedbackEvent } from "@/games/blade-clash/protocol";

/** Everything the phone buzzes for: what the host says happened, plus setup. */
export type BuzzKind = FeedbackEvent | "captured" | "tick";

/**
 * Buzz patterns per event, in milliseconds. `navigator.vibrate` works on
 * Android. iOS Safari has never supported it, so on iPhones this is
 * silently a no op and the sound on the computer carries the feedback.
 */
const PATTERNS: Record<BuzzKind, number[]> = {
  landed: [30, 40, 50],
  hurt: [140],
  clash: [45, 25, 25],
  captured: [20, 60, 40],
  tick: [6],
};

export function buzz(kind: BuzzKind): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(PATTERNS[kind]);
}
