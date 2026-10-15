import type { Athlete } from "./types";

/**
 * A rusher who wins with Rush breaks free of the men holding him at the
 * line: a club and swim, a rip past, then a burst of speed at the QB
 * (rush-shed.ts picks who wins). This is the burst itself: its clock,
 * and how fast it lets him run. The rip plays first, slower, as his
 * arms clear the blocker; then the legs explode.
 */
export const SHED = {
  /** Seconds of club, swim and rip before he is clear. */
  rip: 0.42,
  /** Seconds the whole break free lasts, rip included. */
  dur: 1.9,
  /** His top speed through the rip, and once clear, as shares of his own. */
  ripPace: 0.75,
  boost: 1.3,
} as const;

/** A fresh break free, `side` the shoulder he swims over: 1 his left. */
export const newBurst = (side: 1 | -1): NonNullable<Athlete["burst"]> => ({ t: 0, dur: SHED.dur, side });

/** Moves the burst's clock and ends it. */
export function updateBurst(a: Athlete, dt: number): void {
  if (!a.burst) return;
  a.burst.t += dt;
  if (a.burst.t >= a.burst.dur) a.burst = null;
}

/** The share of his top speed the break free gives him right now: 1 outside one. The boost fades over its last third. */
export function burstPace(a: Athlete): number {
  const b = a.burst;
  if (!b) return 1;
  if (b.t < SHED.rip) return SHED.ripPace;
  const fade = Math.min(1, (b.dur - b.t) / ((b.dur - SHED.rip) / 3));
  return 1 + (SHED.boost - 1) * Math.max(0, fade);
}
