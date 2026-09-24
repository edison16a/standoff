import type { BuzzKind } from "../protocol";

/**
 * Buzz patterns per event, in milliseconds. Android phones buzz; iPhones
 * ignore it, and the word flashed on screen and the sound in the arena
 * carry the moment instead.
 */
const PATTERNS: Record<BuzzKind, number[]> = {
  ball: [22],
  shot: [30],
  green: [20, 40, 60],
  score: [40, 40, 40],
  dunk: [90, 40, 160],
  blocked: [160],
  stolen: [120, 60, 60],
  block: [60, 30, 90],
  steal: [40, 30, 70],
  whistle: [70, 50, 70],
  win: [60, 60, 60, 60, 220],
  lose: [300],
  call: [15, 30, 15],
};

export function buzz(kind: BuzzKind | "tap"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(kind === "tap" ? 12 : PATTERNS[kind]);
}

/** Which way a buzz reads, for the colour of the flashed word. */
export function toneOf(kind: BuzzKind): "good" | "bad" | "info" {
  if (kind === "blocked" || kind === "stolen" || kind === "lose" || kind === "whistle") return "bad";
  if (kind === "ball" || kind === "call" || kind === "shot") return "info";
  return "good";
}
