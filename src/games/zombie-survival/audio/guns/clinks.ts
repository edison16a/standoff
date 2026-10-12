import { bounces, CASINGS, casingSeed, EJECT_HEIGHT, ejectDelay } from "../../ballistics";
import { Rng } from "../../engine/rng";
import type { WeaponId } from "../../engine/weapons";

/** One strike of a spent case on the street. */
export interface Clink {
  /** Seconds after the shot. */
  at: number;
  /** Speed into the ground, metres per second. */
  speed: number;
}

/**
 * Every time this shot's case hits the ground. The case is rebuilt from
 * the same seed the renderer uses (casingSeed of the seat and shot, one
 * Rng drawn for the launch and every bounce), launched from the shared
 * EJECT_HEIGHT when the gun throws it out, so each clink is heard on the
 * frame the case is seen to land.
 */
export function casingClinks(weapon: WeaponId, seat: number, shotId: number): Clink[] {
  const rng = new Rng(casingSeed(seat, shotId));
  const delay = ejectDelay(weapon);
  return bounces(CASINGS[weapon], EJECT_HEIGHT, () => rng.next()).map((b) => ({ at: delay + b.time, speed: b.speed }));
}

/**
 * How loud a strike is, from 0 to 1. A case dropped from shoulder height
 * lands at about five metres a second; the energy, and so the loudness,
 * grows faster than the speed.
 */
export function clinkLevel(speed: number): number {
  return Math.min(1, (speed / 5) ** 1.4);
}
