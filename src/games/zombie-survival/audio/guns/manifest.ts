import type { ActionStep, CasingSpec } from "../../ballistics";
import type { WeaponId } from "../../engine/weapons";

/**
 * Every recorded gun sound the game ships, and which ones each gun uses.
 * The files live in public/games/zombie-survival/sfx/ with their sources
 * and CC0 licences in CREDITS.md there. Several takes of a sound are
 * listed together so repeats pick a different one.
 */

export const SFX_ROOT = "/games/zombie-survival/sfx/";

export const SAMPLE_NAMES = [
  "shot-ak-1",
  "shot-ak-2",
  "shot-rifle-1",
  "shot-smg-1",
  "shot-smg-2",
  "shot-shotgun-1",
  "shot-shotgun-2",
  "dry-click",
  "mag-drop",
  "rifle-mag-out",
  "rifle-mag-in",
  "rifle-mag-seat",
  "rifle-bolt-back",
  "rifle-bolt-forward",
  "ak-mag-out",
  "ak-mag-in",
  "ak-mag-seat",
  "ak-bolt-back",
  "ak-bolt-forward",
  "smg-mag-out",
  "smg-mag-in",
  "smg-mag-seat",
  "smg-bolt-back",
  "smg-bolt-forward",
  "pump-back-1",
  "pump-forward-1",
  "pump-back-2",
  "pump-forward-2",
  "shell-in-1",
  "shell-in-2",
  "brass-1",
  "brass-2",
  "brass-3",
  "brass-4",
  "hull-1",
  "hull-2",
] as const;

export type SampleName = (typeof SAMPLE_NAMES)[number];

/** MP3 because every browser decodes it, Safari included. */
export function sampleUrl(name: SampleName): string {
  return `${SFX_ROOT}${name}.mp3`;
}

/** The takes of each gun's report. */
export const SHOT_SAMPLES: Record<WeaponId, readonly SampleName[]> = {
  shotgun: ["shot-shotgun-1", "shot-shotgun-2"],
  smg: ["shot-smg-1", "shot-smg-2"],
  rifle: ["shot-rifle-1"],
  ak47: ["shot-ak-1", "shot-ak-2"],
};

const PUMP = { "pump-back": ["pump-back-1", "pump-back-2"], "pump-forward": ["pump-forward-1", "pump-forward-2"] } as const;

/**
 * The recording for each reload or cycle step, per gun. A step with no
 * recording here (the release button, the lift, the settle, the AR's
 * bolt catch click) is synthesised. The magazine drop is the same for all.
 */
export const STEP_SAMPLES: Record<WeaponId, Partial<Record<ActionStep, readonly SampleName[]>>> = {
  shotgun: { ...PUMP, "shell-in": ["shell-in-1", "shell-in-2"] },
  smg: {
    "mag-out": ["smg-mag-out"],
    "mag-drop": ["mag-drop"],
    "mag-in": ["smg-mag-in"],
    "mag-seat": ["smg-mag-seat"],
    "bolt-back": ["smg-bolt-back"],
    "bolt-forward": ["smg-bolt-forward"],
  },
  rifle: {
    "mag-out": ["rifle-mag-out"],
    "mag-drop": ["mag-drop"],
    "mag-in": ["rifle-mag-in"],
    "mag-seat": ["rifle-mag-seat"],
    "bolt-back": ["rifle-bolt-back"],
    "bolt-forward": ["rifle-bolt-forward"],
    // The catch lets the held bolt run home: the same slam as letting go of the handle.
    "bolt-catch": ["rifle-bolt-forward"],
  },
  ak47: {
    "mag-out": ["ak-mag-out"],
    "mag-drop": ["mag-drop"],
    "mag-in": ["ak-mag-in"],
    "mag-seat": ["ak-mag-seat"],
    "bolt-back": ["ak-bolt-back"],
    "bolt-forward": ["ak-bolt-forward"],
  },
};

export const DRY_SAMPLES: readonly SampleName[] = ["dry-click"];

/** Steel cases ring like brass, only duller, so they reuse the brass takes through a filter. */
export const CASE_SAMPLES: Record<CasingSpec["material"], readonly SampleName[]> = {
  brass: ["brass-1", "brass-2", "brass-3", "brass-4"],
  steel: ["brass-1", "brass-2", "brass-3", "brass-4"],
  hull: ["hull-1", "hull-2"],
};
