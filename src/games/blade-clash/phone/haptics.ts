import type { FeedbackEvent } from "@/games/blade-clash/protocol";

/** Everything the phone buzzes for: the host's verdicts, plus its own detections and setup. */
export type BuzzKind = FeedbackEvent | "jab" | "parry" | "captured" | "tick";

/**
 * Buzz patterns per event, in milliseconds. `navigator.vibrate` works on
 * Android. iOS Safari has never supported it, and the checkbox switch
 * trick that briefly worked was closed in iOS 26.5, so on iPhones this is
 * silently a no op and the sound on the computer carries the feedback.
 *
 * A strike the phone detects buzzes at once, short and sharp, so the
 * player feels it was read. The host's verdict follows with its own shape.
 */
const PATTERNS: Record<BuzzKind, number[]> = {
  jab: [18],
  parry: [10, 30, 10],
  scored: [30, 40, 30, 40, 60],
  touched: [140],
  parried: [25, 20, 25],
  blocked: [60, 30, 20],
  missed: [8],
  refused: [6, 40, 6],
  captured: [20, 60, 40],
  tick: [6],
};

export function buzz(kind: BuzzKind): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(PATTERNS[kind]);
}
