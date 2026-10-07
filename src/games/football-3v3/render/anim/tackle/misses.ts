import type { DownCause } from "../../../engine/types";
import { over, type Pose } from "../pose";
import { BASE, FLAIL, ON_SIDE, PRONE, QUARTER, ROLLED_BACK, SEATED, SUPINE, WRAP_ARMS } from "./body-keys";
import type { Fall } from "./carrier";

/**
 * Missed tackles, authored for a man falling to his right. A lunge at
 * nothing belly flops and log rolls on with its momentum; a man the
 * juke left grabbing air lands on his shoulder and tumbles over; one
 * the carrier ran through is spun round and dumped on his seat; and a
 * heavy man whose ankles a juke broke sits down hard on the turf. A
 * rusher a blocker pancaked goes up and over onto his back.
 */
const TURN = Math.PI * 2;
/** Tucked in through a roll, the arms in close. */
const BALLED: Partial<Pose> = { shLX: -0.9, shRX: -0.9, elL: -1.9, elR: -1.9, shLZ: 0.2, shRZ: 0.2, kneeL: 1.2, kneeR: 1.0, hipLX: -0.6, hipRX: -0.5 };

export function missFall(cause: DownCause): Fall | null {
  switch (cause) {
    case "whiff":
      return {
        lying: "front",
        keys: [
          [0, over(PRONE, { lift: 0.12 })],
          [0.12, PRONE],
          [0.3, over(PRONE, { barrel: QUARTER * 1.3, ...BALLED })],
          [0.5, over(PRONE, { barrel: TURN, ...BALLED })],
          [0.62, over(PRONE, { barrel: TURN })],
          // A fist into the turf.
          [0.72, over(PRONE, { barrel: TURN, shRX: -1.4, elR: -1.7 })],
          [0.82, over(PRONE, { barrel: TURN })],
        ],
      };
    case "missed":
      return {
        lying: "front",
        keys: [
          [0, over(BASE, { lift: 0.3, pitch: 1.1, neckX: -0.9, shLX: -1.2, shRX: -1.2, shLY: 1.1, shRY: 1.1, elL: -1.6, elR: -1.6, hipLX: 0.2, hipRX: 0.4, kneeL: 0.5, kneeR: 0.8 })],
          [0.18, over(BASE, { lift: 0.15, pitch: 1.35, barrel: 0.6, ...FLAIL, hipLX: 0.2, hipRX: 0.3, kneeL: 0.6, kneeR: 0.9 })],
          [0.38, over(ON_SIDE, FLAIL)],
          [0.62, over(ROLLED_BACK, { ...BALLED, barrel: Math.PI })],
          [0.85, over(ON_SIDE, { ...BALLED, barrel: QUARTER * 3 })],
          [1.05, over(PRONE, { barrel: TURN })],
        ],
      };
    case "shed":
      return {
        lying: "back",
        keys: [
          [0, over(BASE, { pitch: 0.3, ...WRAP_ARMS, hipLX: -0.6, kneeL: 0.9 })],
          [0.16, over(BASE, { pitch: -0.25, yaw: 0.9, spineY: 0.35, ...FLAIL, hipLX: -0.5, kneeL: 0.6, kneeR: 0.3 })],
          [0.4, over(SEATED, { yaw: 1.2, ...FLAIL })],
          [0.62, over(SUPINE, { yaw: 1.2, pitch: -1.3 })],
          [0.8, over(SUPINE, { yaw: 1.2 })],
        ],
      };
    case "juked":
      return {
        lying: "seat",
        keys: [
          [0, BASE],
          [0.18, over(BASE, { roll: -0.35, side: -0.1, pitch: 0.2, hipRZ: -0.25, hipLZ: 0.45, kneeL: 0.3, kneeR: 0.55, ...FLAIL })],
          [0.45, over(SEATED, { roll: -0.25, yaw: -0.4, shRX: 0.9, shRZ: 0.6, shLX: -0.6, shLZ: 0.9 })],
          [0.6, over(SEATED, { roll: -0.15, yaw: -0.4 })],
        ],
      };
    case "pancaked":
      // Driven up and back off his feet by a blocker who won: the legs go up and he lands flat on his back.
      return {
        lying: "back",
        keys: [
          [0, over(BASE, { pitch: -0.3, spineX: -0.35, neckX: 0.4, shLX: -1.3, shRX: -1.3, elL: -0.5, elR: -0.5, kneeL: 0.6, kneeR: 0.4 })],
          [0.2, over(BASE, { lift: 0.16, pitch: -0.95, ...FLAIL, hipLX: -0.9, hipRX: -0.6, kneeL: 0.8, kneeR: 0.5 })],
          [0.42, over(SUPINE, { lift: 0.03 })],
          [0.55, SUPINE],
        ],
      };
    default:
      return null;
  }
}
