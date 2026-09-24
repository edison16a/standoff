import type { FeedbackEvent } from "@/games/fencing/protocol";

/**
 * Buzz patterns per event, in milliseconds. `navigator.vibrate` works on
 * Android. iOS Safari has never supported it, and the checkbox switch
 * trick that briefly worked was closed in iOS 26.5, so on iPhones this is
 * silently a no op and the sound on the computer carries the feedback.
 */
const PATTERNS: Record<FeedbackEvent, number[]> = {
  scored: [30, 40, 30],
  touched: [120],
  parried: [20],
  blocked: [60, 30, 20],
};

export function buzz(event: FeedbackEvent): void {
  if (typeof navigator.vibrate === "function") navigator.vibrate(PATTERNS[event]);
}
