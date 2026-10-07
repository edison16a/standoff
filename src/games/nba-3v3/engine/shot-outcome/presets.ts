import type { Outcome } from "../shot-model";

/**
 * The hand made endings a shot can be given at release. The outcome
 * picker (`pick.ts`) chooses one from how good the shot was, and the
 * solver (`solve.ts`) finds the real flight that ends that way, so the
 * ball always looks like it earned the result. The physics still names
 * each shot with the coarser `Outcome` the rest of the game reads.
 */
export const PRESETS = [
  "swish",
  "bank",
  "frontRimIn",
  "backRimIn",
  "rattleIn",
  "rollIn",
  "rimOut",
  "backIron",
  "rollOut",
  "glassOut",
  "airball",
] as const;
export type ShotPreset = (typeof PRESETS)[number];

export const MAKE_PRESETS = ["swish", "bank", "frontRimIn", "backRimIn", "rattleIn", "rollIn"] as const satisfies readonly ShotPreset[];
export const MISS_PRESETS = ["rimOut", "backIron", "rollOut", "glassOut", "airball"] as const satisfies readonly ShotPreset[];
export type MakePreset = (typeof MAKE_PRESETS)[number];
export type MissPreset = (typeof MISS_PRESETS)[number];

export function isMakePreset(p: ShotPreset): p is MakePreset {
  return (MAKE_PRESETS as readonly string[]).includes(p);
}

/** The preset a coarse outcome stands for, for the showcase and tests that still ask by outcome. */
const FROM_OUTCOME: Record<Outcome, ShotPreset> = {
  swish: "swish",
  bank: "bank",
  bounce: "frontRimIn",
  roll: "rollIn",
  rimOut: "rimOut",
  inOut: "rollOut",
  boardOut: "glassOut",
  airball: "airball",
};

export function asPreset(x: ShotPreset | Outcome): ShotPreset {
  return (PRESETS as readonly string[]).includes(x) ? (x as ShotPreset) : FROM_OUTCOME[x as Outcome];
}
