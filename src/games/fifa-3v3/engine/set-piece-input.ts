import type { Command } from "./types";

/** How fast the stick moves the aim and the curve at full push, per second. */
export const AIM_RATE = { yaw: 0.45, curve: 1.4, across: 3, up: 2 } as const;

/** What the taker's stick and button do this step, from a phone or a computer. */
export interface TakerInput {
  /** Stick to the taker's right, and up. */
  right: number;
  up: number;
  press: boolean;
  release: boolean;
  /** For a release, how long the phone measured the hold. */
  held?: number;
}

/** A phone's command as taker input: the set piece camera stands behind the taker, so screen right is his right. */
export function takerInput(c: Command | undefined): TakerInput {
  if (!c) return { right: 0, up: 0, press: false, release: false };
  return { right: c.move.x, up: -c.move.z, press: c.shootDown === true, release: c.shootUp === true, ...(c.held !== undefined ? { held: c.held } : {}) };
}
