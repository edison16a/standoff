import type { BuzzKind } from "../protocol";

/**
 * Buzz patterns per event, in milliseconds. Android phones buzz; iPhones
 * ignore it, and the word flashed on screen carries the moment instead.
 */
const PATTERNS: Record<BuzzKind, number[]> = {
  hit: [14],
  hurt: [35],
  ko: [40, 40, 90],
  fall: [220],
  ult: [20, 30, 20, 30, 60],
  win: [60, 60, 60, 60, 220],
  lose: [300],
};

/** The word flashed on the controller for each buzz, if any. */
export const FLASH_WORDS: Partial<Record<BuzzKind, { text: string; tone: "good" | "bad" | "info" }>> = {
  ko: { text: "KO!", tone: "good" },
  fall: { text: "Lost a life", tone: "bad" },
  ult: { text: "Ult ready", tone: "info" },
};

export function buzz(kind: BuzzKind | "tap"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(kind === "tap" ? 12 : PATTERNS[kind]);
}
