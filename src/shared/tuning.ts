/**
 * Every number worth tuning by feel lives here. The host owns the values
 * and pushes them to both phones, because the phones run the jab, parry
 * and movement detectors and need the same thresholds the referee expects.
 *
 * These are starting points. Expect to move all of them once two people
 * are actually playing.
 */

export type MovementMode = "position" | "tilt";

export interface Tuning {
  /** Forward acceleration (m/s²) that counts as a jab. */
  jabThreshold: number;
  /** Backward acceleration (m/s²) that counts as a parry. */
  parryThreshold: number;
  /** How long a parry keeps blocking once it fires. */
  parryWindowMs: number;
  /** Quiet time after a jab or parry so the recovery motion is ignored. */
  refractoryMs: number;
  /** Which movement model the phones use. Tilt is the drift free fallback. */
  movementMode: MovementMode;
  /** Acceleration spread (m/s²) below which the phone counts as still. */
  stillnessThreshold: number;
  /** How long the phone has to stay still before velocity snaps to zero. */
  stillnessMs: number;
  /** Arm offset (metres) that maps to full walking speed. */
  moveFullScaleM: number;
  /** Arm offset (metres) near centre that still counts as standing. */
  moveDeadzoneM: number;
  /** Tilt (degrees) ignored near level when in tilt mode. */
  tiltDeadzoneDeg: number;
  /** Tilt (degrees) that maps to full walking speed in tilt mode. */
  tiltFullScaleDeg: number;
  /** A replay ends on its own after this long, skip votes or not. */
  replayTimeoutMs: number;
  /** Master levels, 0 to 1. */
  musicVolume: number;
  crowdVolume: number;
  sfxVolume: number;
  /** Minimum gap between two cheers so they stay special. */
  cheerCooldownMs: number;
}

export const DEFAULT_TUNING: Tuning = {
  jabThreshold: 14,
  parryThreshold: 12,
  parryWindowMs: 1000,
  refractoryMs: 350,
  movementMode: "position",
  stillnessThreshold: 0.35,
  stillnessMs: 200,
  moveFullScaleM: 0.18,
  moveDeadzoneM: 0.03,
  tiltDeadzoneDeg: 8,
  tiltFullScaleDeg: 35,
  replayTimeoutMs: 10000,
  musicVolume: 0.5,
  crowdVolume: 0.6,
  sfxVolume: 0.9,
  cheerCooldownMs: 8000,
};

/** The numeric keys, which is everything except the movement mode switch. */
export type NumericTuningKey = Exclude<keyof Tuning, "movementMode">;

export type TuningGroup = "Strikes" | "Movement" | "Match" | "Sound";

export interface TuningField {
  key: NumericTuningKey;
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
  { key: "jabThreshold", label: "Jab threshold", group: "Strikes", min: 4, max: 40, step: 0.5, unit: "m/s²" },
  { key: "parryThreshold", label: "Parry threshold", group: "Strikes", min: 4, max: 40, step: 0.5, unit: "m/s²" },
  { key: "parryWindowMs", label: "Parry window", group: "Strikes", min: 200, max: 2000, step: 50, unit: "ms" },
  { key: "refractoryMs", label: "Refractory period", group: "Strikes", min: 100, max: 800, step: 10, unit: "ms" },
  { key: "stillnessThreshold", label: "Stillness threshold", group: "Movement", min: 0.05, max: 1.5, step: 0.05, unit: "m/s²" },
  { key: "stillnessMs", label: "Stillness time", group: "Movement", min: 100, max: 400, step: 10, unit: "ms" },
  { key: "moveFullScaleM", label: "Offset for full speed", group: "Movement", min: 0.05, max: 0.4, step: 0.01, unit: "m" },
  { key: "moveDeadzoneM", label: "Offset deadzone", group: "Movement", min: 0, max: 0.1, step: 0.005, unit: "m" },
  { key: "tiltDeadzoneDeg", label: "Tilt deadzone", group: "Movement", min: 0, max: 20, step: 1, unit: "°" },
  { key: "tiltFullScaleDeg", label: "Tilt for full speed", group: "Movement", min: 15, max: 60, step: 1, unit: "°" },
  { key: "replayTimeoutMs", label: "Replay timeout", group: "Match", min: 3000, max: 20000, step: 500, unit: "ms" },
  { key: "musicVolume", label: "Music", group: "Sound", min: 0, max: 1, step: 0.05, unit: "" },
  { key: "crowdVolume", label: "Crowd", group: "Sound", min: 0, max: 1, step: 0.05, unit: "" },
  { key: "sfxVolume", label: "Effects", group: "Sound", min: 0, max: 1, step: 0.05, unit: "" },
  { key: "cheerCooldownMs", label: "Cheer cooldown", group: "Sound", min: 2000, max: 30000, step: 500, unit: "ms" },
];

/** Pulls every numeric value back inside its allowed range. */
export function clampTuning(input: Tuning): Tuning {
  const out: Tuning = { ...input };
  for (const field of TUNING_FIELDS) {
    const value = Number.isFinite(out[field.key]) ? out[field.key] : DEFAULT_TUNING[field.key];
    out[field.key] = Math.min(field.max, Math.max(field.min, value));
  }
  if (out.movementMode !== "position" && out.movementMode !== "tilt") {
    out.movementMode = DEFAULT_TUNING.movementMode;
  }
  return out;
}
