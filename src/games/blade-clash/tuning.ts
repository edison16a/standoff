/**
 * Every number worth tuning by feel lives here. The host owns them all:
 * the phones only report how the sword is held, and every hit and clash
 * is worked out on the computer.
 *
 * These are starting points. Expect to move them once two people are
 * actually playing.
 */

export interface Tuning {
  /** How fast (m/s) the part of the blade that touches must move to count as a hit. */
  hitSpeed: number;
  /** After landing a hit, a blade cannot land another for this long. */
  hitCooldownMs: number;
  /** How fast (m/s) two blades must meet, one against the other, to clash. */
  clashSpeed: number;
  /** How far (degrees) a clash throws both blades. */
  knockAngle: number;
  /** How long the thrown blade flies before it starts back. */
  knockOutMs: number;
  /** How long it takes to ease back into the player's hand. */
  knockReturnMs: number;
  /** Master levels, 0 to 1. */
  musicVolume: number;
  crowdVolume: number;
  sfxVolume: number;
  /** Minimum gap between two cheers so they stay special. */
  cheerCooldownMs: number;
}

export const DEFAULT_TUNING: Tuning = {
  hitSpeed: 3,
  hitCooldownMs: 450,
  clashSpeed: 1.6,
  knockAngle: 38,
  knockOutMs: 150,
  knockReturnMs: 380,
  musicVolume: 0.5,
  crowdVolume: 0.6,
  sfxVolume: 0.9,
  cheerCooldownMs: 8000,
};

export type TuningKey = keyof Tuning;

export type TuningGroup = "Swords" | "Sound";

export interface TuningField {
  key: TuningKey;
  label: string;
  group: TuningGroup;
  min: number;
  max: number;
  step: number;
  unit: string;
}

/**
 * Describes each setting for the tuning panel. The same ranges clamp every
 * change, so no slider can set a hit speed of zero and make a resting
 * blade deadly.
 */
export const TUNING_FIELDS: readonly TuningField[] = [
  { key: "hitSpeed", label: "Hit speed", group: "Swords", min: 1, max: 10, step: 0.1, unit: "m/s" },
  { key: "hitCooldownMs", label: "Hit cooldown", group: "Swords", min: 150, max: 1500, step: 10, unit: "ms" },
  { key: "clashSpeed", label: "Clash speed", group: "Swords", min: 0.5, max: 8, step: 0.1, unit: "m/s" },
  { key: "knockAngle", label: "Clash knockback", group: "Swords", min: 5, max: 90, step: 1, unit: "°" },
  { key: "knockOutMs", label: "Knockback time", group: "Swords", min: 50, max: 500, step: 10, unit: "ms" },
  { key: "knockReturnMs", label: "Return time", group: "Swords", min: 100, max: 1200, step: 10, unit: "ms" },
  { key: "musicVolume", label: "Music", group: "Sound", min: 0, max: 1, step: 0.05, unit: "" },
  { key: "crowdVolume", label: "Crowd", group: "Sound", min: 0, max: 1, step: 0.05, unit: "" },
  { key: "sfxVolume", label: "Effects", group: "Sound", min: 0, max: 1, step: 0.05, unit: "" },
  { key: "cheerCooldownMs", label: "Cheer cooldown", group: "Sound", min: 2000, max: 30000, step: 500, unit: "ms" },
];

/** Pulls every value back inside its allowed range. */
export function clampTuning(input: Tuning): Tuning {
  const out: Tuning = { ...DEFAULT_TUNING };
  for (const field of TUNING_FIELDS) {
    const value = input[field.key];
    out[field.key] = Number.isFinite(value) ? Math.min(field.max, Math.max(field.min, value)) : DEFAULT_TUNING[field.key];
  }
  return out;
}
