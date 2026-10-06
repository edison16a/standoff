import type { TackleKind } from "../../../engine/tackle-preset";
import { over, type Keys, type Pose } from "../pose";
import { BASE, FLAIL, ON_SIDE, PRONE, ROLLED_BACK, SUPINE, TUCKED } from "./body-keys";
import type { Lying } from "./getup";

/**
 * The ball carrier's side of each tackle, authored with the tackler on
 * his left, in seconds from the hit. The ball stays tucked under the
 * right arm all the way down; the free arm flails and reaches for the
 * turf. `run` is his running pose, for a stumble that starts mid stride.
 */
export interface Fall {
  keys: Keys;
  lying: Lying;
}

/** The free arm thrown out to break the fall. */
const BRACE: Partial<Pose> = { shLX: -2.3, shLZ: 0.45, elL: -0.25 };
/** Face down with the ball held in under the chest. */
const PRONE_BALL = over(PRONE, { shRX: -0.9, elR: -2.1, shRY: 0.6, shRZ: 0.15 });

export function carrierFall(kind: TackleKind, run: Pose): Fall {
  switch (kind) {
    case "wrap":
      // Hit at the hips from the left: the legs go out from under him, he lands on his right side and both roll on over.
      return {
        lying: "rolled",
        keys: [
          [0, over(BASE, { pitch: 0.25, roll: -0.3, spineZ: 0.25, ...FLAIL, ...TUCKED, hipLX: -0.35, kneeL: 0.5, kneeR: 0.3 })],
          [0.2, over(BASE, { lift: 0.32, pitch: 0.75, barrel: 0.55, spineX: 0.2, ...TUCKED, shLX: -1.7, shLZ: 0.9, elL: -0.4, hipLX: -0.7, hipRX: 0.35, kneeL: 1.0, kneeR: 0.4 })],
          [0.42, over(ON_SIDE, { ...TUCKED, ...BRACE })],
          [0.75, over(ON_SIDE, { barrel: 2.3, ...TUCKED, shLX: -1.2, shLZ: 0.8 })],
          [1.0, over(ROLLED_BACK, TUCKED)],
        ],
      };
    case "drive":
      // He faces the hit: the chest caves, the feet are driven back from under him and he lands flat on his back.
      return {
        lying: "back",
        keys: [
          [0, over(BASE, { pitch: -0.2, spineX: -0.35, neckX: 0.4, ...TUCKED, shLX: -1.2, shLZ: 0.8, elL: -0.6, hipLX: -0.3, hipRX: 0.2, kneeL: 0.5, kneeR: 0.3 })],
          [0.22, over(BASE, { lift: 0.14, pitch: -0.6, spineX: -0.2, neckX: 0.5, ...TUCKED, shLX: -1.5, shLZ: 1.1, hipLX: -0.9, hipRX: -0.4, kneeL: 1.0, kneeR: 0.7 })],
          [0.48, over(SUPINE, { ...TUCKED, lift: 0.04 })],
          [0.62, over(SUPINE, TUCKED)],
        ],
      };
    case "ankle":
      // The feet stop dead in the tackler's arms and the rest of him topples on forward onto his chest.
      return {
        lying: "front",
        keys: [
          [0, over(BASE, { pitch: 0.35, ...TUCKED, shLX: -1.3, shLZ: 0.5, hipLX: 0.3, hipRX: 0.25, kneeL: 0.2, kneeR: 0.3 })],
          [0.25, over(BASE, { lift: 0.08, pitch: 1.0, neckX: -0.9, ...TUCKED, ...BRACE, hipLX: 0.15, hipRX: 0.1, kneeL: 0.2, kneeR: 0.3 })],
          [0.45, PRONE_BALL],
        ],
      };
    case "shoestring":
      // A heel clipped: he stumbles on a few strides, pitching further forward each one, then dives onto his chest.
      return {
        lying: "front",
        keys: [
          [0, over(run, { pitch: run.pitch + 0.2, ...TUCKED, shLZ: 0.9, shLX: -0.8 })],
          [0.42, over(run, { pitch: run.pitch + 0.65, spineX: 0.3, ...TUCKED, shLZ: 1.1, shLX: -1.4, neckX: -1.0 })],
          [0.6, over(BASE, { lift: 0.14, pitch: 1.05, neckX: -0.9, ...TUCKED, ...BRACE, hipLX: 0.35, hipRX: -0.5, kneeL: 0.3, kneeR: 1.0 })],
          [0.78, PRONE_BALL],
        ],
      };
    case "gang":
      // Stood up by the first man, his legs churning, then buried by the second and down on his side.
      return {
        lying: "side",
        keys: [
          [0, over(BASE, { pitch: 0.2, roll: -0.15, spineZ: 0.15, ...TUCKED, shLX: -0.8, shLZ: 0.7, hipLX: -0.5, kneeL: 0.8, hipRX: 0.2, kneeR: 0.5 })],
          [0.35, over(BASE, { pitch: 0.45, roll: -0.35, ...TUCKED, shLX: -1.4, shLZ: 0.9, hipLX: -0.6, hipRX: -0.3, kneeL: 1.0, kneeR: 0.9 })],
          [0.7, over(ON_SIDE, { ...TUCKED, ...BRACE })],
          [0.9, over(ON_SIDE, { barrel: 1.25, ...TUCKED, shLX: -1.8 })],
        ],
      };
  }
}
