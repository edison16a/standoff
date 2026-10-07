import type { Pose } from "../pose";

/**
 * The arm and body shapes the catch moves are built from, as partial
 * poses laid over the running stride. Authored with the ball coming in
 * on the catcher's left; the moves mirror them for a ball on his right.
 * A negative shoulder X lifts the arm forward and up, a negative elbow
 * bends it, a positive shoulder Y turns the hands in toward each other.
 */
export type Part = Partial<Pose>;

/** Several parts laid over each other, later ones winning. */
export const join = (...parts: Part[]): Part => Object.assign({}, ...parts);

/**
 * Both hands up to where the ball will be, `h` metres high: a diamond
 * of thumbs in front of the face for a ball at the chest, arms straight
 * over the helmet for one up high. The chest turns toward it and the
 * eyes follow it in.
 */
export function handsTo(h: number): Part {
  const up = Math.max(0, Math.min(1, (h - 0.6) / 1.6));
  const sh = -(0.95 + up * 1.95);
  return {
    shLX: sh, shRX: sh + 0.1, elL: -0.75 + up * 0.55, elR: -0.8 + up * 0.55,
    shLY: 0.45, shRY: 0.4, shLZ: 0.2, shRZ: 0.12,
    spineY: 0.28, neckY: 0.2, neckX: -(h - 1.15) * 0.55,
  };
}

/** Pulled into the chest with both hands, the body curled over it. */
export const CRADLE: Part = { shLX: -0.85, shRX: -0.8, elL: -2.0, elR: -2.05, shLY: 0.75, shRY: 0.7, shLZ: 0.15, shRZ: 0.15, spineX: 0.25, neckX: 0.35, spineY: 0.1 };

/** Tucked high and tight under the right arm, the left hand over the point. */
export const SECURE: Part = { shRX: -0.35, elR: -2.0, shRY: 0.5, shRZ: 0.1, shLX: -0.75, elL: -1.75, shLY: 0.85, shLZ: 0.1 };

/** Knees bent to give with the ball, the hips sat down a little. */
export const GIVE: Part = { hipLX: -0.55, hipRX: -0.45, kneeL: 0.95, kneeR: 0.85, ankL: -0.25, ankR: -0.2, pitch: 0.12 };

/** A crouch to load a leap: hips back, knees deep, arms swung down behind. */
export const LOAD: Part = { pitch: 0.3, hipLX: -1.0, hipRX: -0.9, kneeL: 1.55, kneeR: 1.45, ankL: -0.4, ankR: -0.4, shLX: 0.65, shRX: 0.6, elL: -0.3, elR: -0.3, spineX: 0.2, neckX: -0.4 };

/** In the air off one leg: the take off leg hangs, the other knee drives up. */
export const AIR: Part = { pitch: -0.05, hipLX: -1.05, kneeL: 1.35, hipRX: 0.15, kneeR: 0.45, ankL: 0.2, ankR: 0.5 };

/** Landing: both feet down wide, knees soaking it up. */
export const LAND: Part = { pitch: 0.2, hipLX: -0.8, hipRX: -0.7, kneeL: 1.25, kneeR: 1.15, hipLZ: 0.18, hipRZ: 0.18, ankL: -0.35, ankR: -0.35 };

/** Laid out flat in the air, arms reaching past the helmet, legs trailing. */
export const LAYOUT: Part = {
  pitch: 1.3, neckX: -0.95, spineX: -0.1,
  shLX: -2.95, shRX: -2.85, elL: -0.15, elR: -0.2, shLY: 0.35, shRY: 0.3, shLZ: 0.12, shRZ: 0.1,
  hipLX: 0.25, hipRX: 0.4, kneeL: 0.35, kneeR: 0.6, ankL: 0.6, ankR: 0.6,
};

/** The head turned back over the left shoulder and the hands up behind it, little fingers together. */
export const OVER_SHOULDER: Part = {
  spineY: 0.55, neckY: 1.05, neckX: -0.35,
  shLX: -2.55, shRX: -2.35, elL: -0.55, elR: -0.7, shLY: -0.35, shRY: 0.75, shLZ: 0.55, shRZ: -0.05,
};

/** Hands flung open off a ball that would not stay, eyes down after it. */
export const OPEN: Part = { shLX: -1.15, shRX: -1.2, shLZ: 0.95, shRZ: 0.9, elL: -0.35, elR: -0.3, shLY: -0.2, shRY: -0.2, neckX: 0.55, spineX: 0.15 };

/** Rocked back by a hit as the ball arrives: chest up, arms thrown wide. */
export const JOLT: Part = { pitch: -0.35, spineX: -0.35, roll: -0.25, neckX: 0.35, shLX: -0.8, shRX: -1.3, shLZ: 1.25, shRZ: 1.0, elL: -0.4, elR: -0.6 };

/** Hands snapping shut on nothing as the ball goes by. */
export const CLAP: Part = { shLX: -1.7, shRX: -1.7, elL: -0.25, elR: -0.25, shLY: 0.75, shRY: 0.75, shLZ: 0.0, shRZ: 0.0, neckY: 0.6 };

/** The swatting hand raised high, the other arm up for balance. */
export const SWAT_UP: Part = { shLX: -3.05, elL: -0.15, shLZ: 0.25, shRX: -2.2, elR: -0.6, shRZ: 0.35, spineY: 0.25, neckX: -0.55 };

/** The swat: the arm whips down and across through the ball, the chest turning with it. */
export const SWAT_DOWN: Part = { shLX: -1.15, elL: -0.1, shLZ: -0.05, shLY: 0.6, shRX: -1.5, elR: -0.7, shRZ: 0.6, spineY: -0.35, spineX: 0.3, neckX: 0.1 };
