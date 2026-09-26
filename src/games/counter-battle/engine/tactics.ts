import type { GunId } from "./guns";
import { PRESSURE } from "./tuning";

/**
 * How a fighter plays with each gun. The movement brain reads these; the
 * guns themselves live in guns.ts. The rifle and sniper hold long lanes,
 * the SMG roams mid range and moves the most, the shotgun flanks in.
 */
export interface Style {
  /** The distance to the nearest enemy this gun likes, in metres. */
  range: number;
  /** How far off that range still feels fine. */
  band: number;
  /** How quickly holding one spot gets old, per second. */
  restless: number;
  /** How much it values spots that see round the enemy's cover. */
  flank: number;
  /** How much it values being hidden from the enemy. */
  safety: number;
  /** Seconds hiding, then peeking, at a spot: [min, max]. */
  hide: [number, number];
  peek: [number, number];
}

export const STYLES: Record<GunId, Style> = {
  rifle: { range: 23, band: 9, restless: 0.09, flank: 0.35, safety: 1.6, hide: [0.9, 1.8], peek: [1.4, 2.4] },
  sniper: { range: 31, band: 11, restless: 0.06, flank: 0.1, safety: 1.9, hide: [1.3, 2.4], peek: [1.6, 2.8] },
  smg: { range: 13, band: 6, restless: 0.2, flank: 0.6, safety: 1.2, hide: [0.6, 1.2], peek: [1, 1.7] },
  shotgun: { range: 6, band: 4, restless: 0.16, flank: 1.3, safety: 1.3, hide: [0.5, 1.1], peek: [0.7, 1.3] },
};

/**
 * How hard the round is pushing fighters together, 0 to 1. It builds
 * after the opening seconds, and jumps once one side is a player down, so
 * the side ahead pushes and no round ends in a hiding contest.
 */
export function pressureAt(roundTime: number, uneven: boolean): number {
  const t = Math.min(1, Math.max(0, (roundTime - PRESSURE.start) / (PRESSURE.full - PRESSURE.start)));
  return uneven ? Math.max(t, 0.5) : t;
}

/** The distance a style wants under pressure: long guns give ground slowest. */
export function wantedRange(style: Style, pressure: number): number {
  return Math.max(4, style.range * (1 - 0.55 * pressure));
}
