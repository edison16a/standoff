import { neutral, over, type Pose } from "../pose";

/**
 * The bodies line play is built from, for a lineman facing the man
 * across from him. A forward pitch drives the pads low; `fwd` puts the
 * hips back off the spot so two sets of pads meet at the hands rather
 * than through each other. A negative shoulder X punches an arm out.
 */
const base = neutral();

/** Both hands shot out to the other man's chest plate, elbows in, off the snap. */
export const PUNCH = over(base, {
  fwd: -0.12, pitch: 0.55, spineX: 0.1, neckX: -0.5,
  shLX: -1.55, shRX: -1.55, elL: -0.1, elR: -0.1, shLZ: 0.12, shRZ: 0.12, shLY: 0.2, shRY: 0.2,
  hipLX: -0.85, hipRX: -0.55, kneeL: 1.15, kneeR: 0.85, hipLZ: 0.2, hipRZ: 0.2,
});

/** Hand fight: one hand chopping down the other man's arm while the other fights for the inside. */
export const FIGHT_L = over(PUNCH, { shLX: -1.1, elL: -1.2, shLY: 0.8, shRX: -1.7, elR: -0.2, spineY: 0.15 });
export const FIGHT_R = over(PUNCH, { shRX: -1.1, elR: -1.2, shRY: 0.8, shLX: -1.7, elL: -0.2, spineY: -0.15 });

/** The blocker's pass set: tall in the chest, hips sat back, hands up inside, ready to punch again. */
export const PASS_SET = over(base, {
  fwd: -0.2, pitch: 0.25, spineX: -0.05, neckX: -0.2,
  shLX: -1.2, shRX: -1.2, elL: -0.9, elR: -0.9, shLZ: 0.2, shRZ: 0.2, shLY: 0.35, shRY: 0.35,
  hipLX: -0.9, hipRX: -0.75, kneeL: 1.2, kneeR: 1.05, hipLZ: 0.32, hipRZ: 0.32,
});

/** The rusher's bull rush: low, arms locked out into the blocker's chest, legs driving. */
export const BULL = over(base, {
  fwd: -0.15, pitch: 0.75, spineX: 0.05, neckX: -0.75,
  shLX: -1.45, shRX: -1.45, elL: -0.05, elR: -0.05, shLZ: 0.15, shRZ: 0.15,
  hipLX: -0.45, hipRX: 0.05, kneeL: 0.95, kneeR: 0.55, hipLZ: 0.15, hipRZ: 0.15,
});

/** Firing out low on a run: pads under the other man's, hands inside, walking him back. */
export const DRIVE = over(BULL, { pitch: 0.85, neckX: -0.85, shLX: -1.35, shRX: -1.35, elL: -0.35, elR: -0.35 });

/** Being driven back: chest up, heels digging in, arms bent under the push. */
export const GIVING = over(base, {
  fwd: -0.1, pitch: 0.2, spineX: -0.25, neckX: 0.05,
  shLX: -1.1, shRX: -1.1, elL: -0.9, elR: -0.9, shLZ: 0.25, shRZ: 0.25,
  hipLX: -0.7, hipRX: -0.35, kneeL: 0.9, kneeR: 0.75, hipLZ: 0.25, hipRZ: 0.25,
});

/** Anchored: the hips dropped deep and wide, the back flat, arms locked against a rusher who is winning. */
export const ANCHOR = over(base, {
  fwd: -0.24, pitch: 0.4, spineX: -0.1, neckX: -0.35,
  shLX: -1.4, shRX: -1.4, elL: -0.25, elR: -0.25, shLZ: 0.2, shRZ: 0.2,
  hipLX: -1.25, hipRX: -1.1, kneeL: 1.6, kneeR: 1.45, hipLZ: 0.38, hipRZ: 0.38, ankL: -0.3, ankR: -0.3,
});

/** The pancake's finish: thrown forward over the man he flattened, on his knees and hands above him. */
export const OVER_HIM = over(base, {
  pitch: 1.05, neckX: -0.6, spineX: 0.1,
  shLX: -1.2, shRX: -1.2, elL: -0.1, elR: -0.1, shLZ: 0.3, shRZ: 0.3,
  hipLX: -1.3, hipRX: -1.2, kneeL: 1.9, kneeR: 1.8, hipLZ: 0.2, hipRZ: 0.2,
});

/** Standing over him, chest puffed, before he goes again. */
export const STAND_OVER = over(base, { pitch: 0.15, spineX: -0.2, neckX: 0.35, shLX: -0.4, shRX: -0.3, elL: -1.1, elR: -1.2, shLZ: 0.45, shRZ: 0.45 });

/** The swim: the right arm thrown over the top of the blocker's shoulder, the hips turning through. */
export const SWIM = over(BULL, { yaw: 0.45, spineY: 0.35, shRX: -2.9, elR: -0.4, shRZ: 0.25, shLX: -1.3, elL: -0.5, shLZ: 0.35, pitch: 0.6 });

/** Through: the swim arm comes down behind him, low and turning the corner. */
export const RIP_THROUGH = over(base, {
  yaw: 0.6, pitch: 0.65, spineY: 0.2, neckX: -0.6,
  shRX: 0.6, elR: -0.6, shRZ: 0.3, shLX: -1.0, elL: -1.3,
  hipLX: -1.0, kneeL: 1.2, hipRX: 0.3, kneeR: 0.4,
});

/** Beaten: twisted round by the rip, one arm grabbing at the man going by. */
export const BEATEN = over(base, {
  yaw: -0.7, spineY: -0.4, pitch: 0.3, roll: 0.15, neckY: -0.6,
  shLX: -1.6, elL: -0.2, shLZ: 0.6, shRX: -0.6, elR: -0.7, shRZ: 0.9,
  hipLX: -0.6, kneeL: 0.9, hipRX: -0.2, kneeR: 0.5, hipLZ: 0.3,
});

export type { Pose };
