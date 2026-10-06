import type { TackleKind } from "../../../engine/tackle-preset";
import { over } from "../pose";
import { BASE, churn, ON_SIDE, PRONE, ROLLED_BACK, WRAP_ARMS } from "./body-keys";
import type { Fall } from "./carrier";

/**
 * The tackler's side of each preset, authored from the carrier's left,
 * in seconds from the hit, timed against the carrier's fall so the two
 * bodies go down together. The engine holds him at the matching place
 * on the carrier (tackle-moves.ts), so arms that wrap here wrap the man.
 */

/** Kneeling astride a man on his back, chest down over him, arms still round him. */
const ASTRIDE = over(BASE, {
  pitch: 1.2, spineX: 0.35, neckX: -1.0, ...WRAP_ARMS, shLX: -1.2, shRX: -1.2,
  hipLX: -1.2, hipRX: -1.2, kneeL: 1.6, kneeR: 1.6, hipLZ: 0.35, hipRZ: 0.35,
});

export function tacklerFall(kind: TackleKind, t: number): Fall {
  switch (kind) {
    case "wrap":
      // Launched at the hips, he wraps, rides the man down onto his side and rolls over the top of him.
      return {
        lying: "rolled",
        keys: [
          [0, over(BASE, { lift: 0.55, pitch: 0.85, yaw: -0.35, spineY: -0.3, neckX: -0.6, ...WRAP_ARMS, hipLX: 0.3, hipRX: 0.5, kneeL: 0.5, kneeR: 0.8 })],
          [0.2, over(BASE, { lift: 0.45, pitch: 1.15, barrel: 0.5, yaw: -0.25, neckX: -0.8, ...WRAP_ARMS, hipLX: 0.2, hipRX: 0.4, kneeL: 0.6, kneeR: 0.9 })],
          [0.42, over(ON_SIDE, { barrel: 1.3, lift: 0.12, ...WRAP_ARMS })],
          [0.75, over(ON_SIDE, { barrel: 2.4, lift: 0.4, ...WRAP_ARMS })],
          [1.0, over(ROLLED_BACK, { shLX: -0.8, shLZ: 0.5 })],
        ],
      };
    case "drive": {
      // Shoulder into the chest, legs churning as he drives him back, then down on top of him.
      const hit = churn(over(BASE, { pitch: 0.6, spineX: 0.2, neckX: -0.7, ...WRAP_ARMS, hipLX: -0.9, kneeL: 1.2, hipRX: 0.35, kneeR: 0.5 }), t, 0.42);
      return { lying: "seat", keys: [[0, hit], [0.42, over(hit, { pitch: 0.85 })], [0.62, ASTRIDE]] };
    }
    case "ankle":
      // Low at the shins: he lands flat hugging both ankles and holds on while the man topples.
      return {
        lying: "front",
        keys: [
          [0, over(BASE, { lift: 0.15, pitch: 1.3, neckX: -1.1, shLX: -2.2, shRX: -2.2, shLY: 0.6, shRY: 0.6, elL: -1.1, elR: -1.1, hipLX: 0.2, hipRX: 0.4, kneeL: 0.4, kneeR: 0.7 })],
          [0.3, over(PRONE, { shLX: -2.5, shRX: -2.5, shLY: 0.7, shRY: 0.7, elL: -1.0, elR: -1.0, neckX: -0.6 })],
          [0.9, over(PRONE, { shLX: -2.5, shRX: -2.5, shLY: 0.7, shRY: 0.7, elL: -1.0, elR: -1.0, neckX: -0.3 })],
        ],
      };
    case "shoestring":
      // Laid out flat behind him, one hand clipping the heel, then skidding on his chest.
      return {
        lying: "front",
        keys: [
          [0, over(BASE, { lift: 0.3, pitch: 1.45, neckX: -1.1, shLX: -2.9, shRX: -2.75, elL: -0.1, elR: -0.2, shLZ: 0.15, shRZ: 0.1, hipLX: 0.25, hipRX: 0.35, kneeL: 0.5, kneeR: 0.8 })],
          [0.32, over(PRONE, { shLX: -2.9, shRX: -2.8, elL: -0.1, elR: -0.15, shLZ: 0.2, shRZ: 0.2 })],
        ],
      };
    case "gang": {
      // He stands the man up with his arms locked round him, then goes down on his side with him.
      const hold = churn(over(BASE, { pitch: 0.75, yaw: -0.4, spineY: -0.3, neckX: -0.8, ...WRAP_ARMS, hipLX: -0.8, kneeL: 1.1, hipRX: 0.3, kneeR: 0.6 }), t, 0.35);
      return { lying: "side", keys: [[0, hold], [0.35, over(hold, { pitch: 0.95 })], [0.7, over(ON_SIDE, { barrel: 1.2, lift: 0.05, ...WRAP_ARMS })]] };
    }
  }
}

/** A second man piling on: the last strides in, a dive onto the heap, and lying across the top of it. */
export function pileFall(t: number): Fall {
  const run = churn(over(BASE, { pitch: 0.6, neckX: -0.7, ...WRAP_ARMS, hipLX: -0.9, kneeL: 1.2, hipRX: 0.3, kneeR: 0.5 }), t, 0.3);
  return {
    lying: "front",
    keys: [
      [0, run],
      [0.35, over(BASE, { lift: 0.55, pitch: 1.2, ...WRAP_ARMS, shLX: -2.2, shRX: -2.2, hipLX: 0.3, hipRX: 0.4, kneeL: 0.6, kneeR: 0.9 })],
      [0.7, over(PRONE, { lift: 0.38, ...WRAP_ARMS, shLX: -2.0, shRX: -2.0 })],
    ],
  };
}

