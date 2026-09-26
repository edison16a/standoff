import type { BuzzKind } from "../protocol";

/**
 * Buzz patterns per event, in milliseconds. Android phones buzz; iPhones
 * ignore it, and the word flashed on screen carries the moment instead.
 */
const PATTERNS: Record<BuzzKind, number[]> = {
  hit: [12],
  head: [20, 30, 20],
  kill: [30, 40, 60],
  hurt: [45],
  down: [250],
  dry: [8],
  reloaded: [18],
  win: [60, 60, 60, 60, 220],
  lose: [300],
};

/** The word flashed on the controller for each buzz, if any. */
export const FLASH_WORDS: Partial<Record<BuzzKind, { text: string; tone: "good" | "bad" }>> = {
  head: { text: "Head shot", tone: "good" },
  kill: { text: "Kill", tone: "good" },
  down: { text: "You are down", tone: "bad" },
};

export function buzz(kind: BuzzKind | "tap"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(kind === "tap" ? 12 : PATTERNS[kind]);
}
