/**
 * Every number worth tuning by feel lives here. The host owns the values
 * and pushes them to both phones, because the phones run the jab and parry
 * detector and need the same thresholds the referee expects.
 *
 * These are starting points. Expect to move all of them once two people
 * are actually playing.
 */

export interface Tuning {
  /** Acceleration (m/s², any direction) of a quick move that counts as a jab. */
  strikeAccel: number;
  /** Turn rate (degrees a second, about any axis) that counts as a jab. */
  strikeSpin: number;
  /** How far above the calibrated guard (degrees) the blade must rise to parry. */
  parryRise: number;
  /** How far right of the calibrated guard (degrees) it must swing as well. */
  parryRight: number;
  /** How long a parry keeps blocking once it fires. */
  parryWindowMs: number;
  /** Quiet time after a jab or parry, so one shake reads as one jab. */
  refractoryMs: number;
  /** Master levels, 0 to 1. */
  musicVolume: number;
  crowdVolume: number;
  sfxVolume: number;
  /** Minimum gap between two cheers so they stay special. */
  cheerCooldownMs: number;
}

export const DEFAULT_TUNING: Tuning = {
  strikeAccel: 12,
  strikeSpin: 300,
  parryRise: 30,
  parryRight: 20,
  parryWindowMs: 600,
  refractoryMs: 350,
  musicVolume: 0.5,
  crowdVolume: 0.6,
  sfxVolume: 0.9,
  cheerCooldownMs: 8000,
};

export type TuningKey = keyof Tuning;

export type TuningGroup = "Strikes" | "Sound";

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
 * Describes each numeric setting for the tuning panel. The same ranges
 * clamp values coming over the wire, so a bad client can never push a
 * threshold of zero and make every twitch a jab.
 */
export const TUNING_FIELDS: readonly TuningField[] = [
  { key: "strikeAccel", label: "Jab force", group: "Strikes", min: 4, max: 40, step: 0.5, unit: "m/s²" },
  { key: "strikeSpin", label: "Jab turn", group: "Strikes", min: 90, max: 900, step: 10, unit: "°/s" },
  { key: "parryRise", label: "Parry rise", group: "Strikes", min: 10, max: 70, step: 1, unit: "°" },
  { key: "parryRight", label: "Parry right", group: "Strikes", min: 5, max: 60, step: 1, unit: "°" },
  { key: "parryWindowMs", label: "Parry window", group: "Strikes", min: 200, max: 2000, step: 50, unit: "ms" },
  { key: "refractoryMs", label: "Refractory period", group: "Strikes", min: 100, max: 800, step: 10, unit: "ms" },
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
