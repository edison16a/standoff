import { WEAPONS, type WeaponId } from "../../engine/weapons";

/**
 * What a flying round looks like. A tracer's burning compound glows
 * bright. An ordinary round only shows as a faint shimmer of hot air.
 * Buckshot is a cloud of small fast specks.
 */
export type RoundKind = "heat" | "pellet";

export interface RoundLook {
  /** Fraction of the camera's shutter the streak is blurred over. */
  blur: number;
  /** Width at the head and the tail, metres. */
  head: number;
  tail: number;
  alpha: number;
  /** Soft glow around the core, 0 for none. */
  glow: number;
  /** How the brightness runs from the tail (0) to the head (1). Higher keeps it nearer the head. */
  falloff: number;
}

/**
 * A film camera's shutter at 180 degrees and 45 frames, about what a
 * game trailer looks like: long enough to smear a rifle round into a
 * streak, short enough that it still reads as a single round.
 */
export const SHUTTER = 1 / 90;

export const LOOKS: Record<RoundKind, RoundLook> = {
  heat: { blur: 0.35, head: 0.014, tail: 0.004, alpha: 0.22, glow: 0.2, falloff: 1 },
  pellet: { blur: 0.3, head: 0.016, tail: 0.005, alpha: 0.4, glow: 0.3, falloff: 1.2 },
};

/** The look of the round a shot fired, from what is left in the gun. */
export function roundKind(weapon: WeaponId): RoundKind {
  if (WEAPONS[weapon].pellets > 1) return "pellet";
  return "heat";
}

/** A colour as three channels from 0 to 1. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** An untraced round heats the air to a dull warm shimmer. */
const SHIMMER: Rgb = { r: 1, g: 0.78, b: 0.55 };
/** Buckshot specks catch the flash: pale gold. */
const SPECK: Rgb = { r: 1, g: 0.86, b: 0.6 };

/** A round's colour. */
export function roundColour(kind: RoundKind, _player: Rgb, out: Rgb): Rgb {
  const base = kind === "heat" ? SHIMMER : SPECK;
  out.r = base.r;
  out.g = base.g;
  out.b = base.b;
  return out;
}
