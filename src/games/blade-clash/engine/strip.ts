import { MIN_GAP, RESET_GAP, STRIP_HALF_LENGTH } from "./rules";

/** Keeps a position on the strip. Stepping off the back end is not allowed. */
export function clampToStrip(x: number): number {
  return Math.min(STRIP_HALF_LENGTH, Math.max(-STRIP_HALF_LENGTH, x));
}

/** Distance between the two fencers, left fencer at `left`, right at `right`. */
export function gapBetween(left: number, right: number): number {
  return right - left;
}

/** True when both bodies have closed in so far that they collide. */
export function isCorpsACorps(left: number, right: number): boolean {
  return gapBetween(left, right) < MIN_GAP;
}

/**
 * Where to put both fencers after a corps-à-corps: a safe distance apart,
 * centred on where they collided, and shifted back on the strip if that
 * would push someone off the end.
 */
export function separate(left: number, right: number): [number, number] {
  const middle = (left + right) / 2;
  const half = RESET_GAP / 2;
  const limit = STRIP_HALF_LENGTH - half;
  const centre = Math.min(limit, Math.max(-limit, middle));
  return [centre - half, centre + half];
}
