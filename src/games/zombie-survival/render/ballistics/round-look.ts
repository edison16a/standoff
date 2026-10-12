import { isTracer, ROUNDS } from "../../ballistics/rounds";
import { WEAPONS, type WeaponId } from "../../engine/weapons";

/**
 * What a flying round looks like. A tracer's burning compound glows
 * bright. An ordinary round only shows as a faint shimmer of hot air.
 * Buckshot is a cloud of small fast specks.
 */
export type RoundKind = "tracer" | "heat" | "pellet";

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
  tracer: { blur: 1, head: 0.05, tail: 0.012, alpha: 1, glow: 0.9, falloff: 1.4 },
  heat: { blur: 0.35, head: 0.014, tail: 0.004, alpha: 0.22, glow: 0.2, falloff: 1 },
  pellet: { blur: 0.3, head: 0.016, tail: 0.005, alpha: 0.4, glow: 0.3, falloff: 1.2 },
};

/**
 * Which round of the magazine a shot fired, counting from 0 for the first
 * round of a full magazine, from the rounds left after it.
 */
export function roundIndex(weapon: WeaponId, left: number): number {
  return Math.max(0, WEAPONS[weapon].magazine - 1 - left);
}

/** The look of the round a shot fired, from what is left in the gun. */
export function roundKind(weapon: WeaponId, left: number): RoundKind {
  if (WEAPONS[weapon].pellets > 1) return "pellet";
  return isTracer(ROUNDS[weapon], roundIndex(weapon, left)) ? "tracer" : "heat";
}

/** A colour as three channels from 0 to 1. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Burning tracer compound is a hot orange red. */
const BURN: Rgb = { r: 1, g: 0.45, b: 0.12 };
/** An untraced round heats the air to a dull warm shimmer. */
const SHIMMER: Rgb = { r: 1, g: 0.78, b: 0.55 };
/** Buckshot specks catch the flash: pale gold. */
const SPECK: Rgb = { r: 1, g: 0.86, b: 0.6 };

/**
 * A round's colour. Tracers burn in the shooter's colour blended with
 * hot orange, so each player can follow their own fire and it still
 * looks like burning compound. The others are the same for everyone.
 */
export function roundColour(kind: RoundKind, player: Rgb, out: Rgb): Rgb {
  const base = kind === "tracer" ? BURN : kind === "heat" ? SHIMMER : SPECK;
  const k = kind === "tracer" ? 0.45 : 0;
  out.r = base.r + (player.r - base.r) * k;
  out.g = base.g + (player.g - base.g) * k;
  out.b = base.b + (player.b - base.b) * k;
  return out;
}
