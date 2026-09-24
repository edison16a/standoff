/**
 * What every gesture primitive reports on each frame. `amount` is in the
 * primitive's own unit, always relative to the player's size, and
 * `confidence` is 0 to 1: how clearly the move is happening, allowing for
 * how well the body is seen.
 */
export interface Reading {
  active: boolean;
  amount: number;
  confidence: number;
}

/** A state that switches on at one level and off at a lower one, so it never flickers at the edge. */
export function hysteresis(active: boolean, value: number, on: number, off: number): boolean {
  return active ? value >= off : value >= on;
}
