import { over } from "../pose";
import { BASE, churn, FLAIL, ON_SIDE, PRONE, TUCKED, WRAP_ARMS } from "./body-keys";
import type { Fall } from "./carrier";

/**
 * Sacks, authored for a QB caught with the ball in the pocket. The
 * spin: the rusher wraps him up from the side in a bear hug, swings him
 * round off his feet and throws him down on his side, landing on him.
 * The blindside: hit square in the back as he looks downfield, his head
 * snaps back, the ball arm flies out and he is driven face first into
 * the turf with the rusher on top. In seconds from the hit, the rusher
 * on the QB's left (mirrored for his right).
 */

/** Face down, the ball pulled in under him late. */
const PRONE_BALL = over(PRONE, { shRX: -0.9, elR: -2.1, shRY: 0.6, shRZ: 0.15 });

const SPIN_QB: Fall = {
  lying: "side",
  keys: [
    [0, over(BASE, { lift: 0.08, yaw: 0.3, spineZ: 0.2, ...FLAIL, ...TUCKED, hipLX: -0.3, kneeL: 0.4 })],
    [0.25, over(BASE, { lift: 0.3, yaw: 1.0, roll: -0.45, ...FLAIL, ...TUCKED, hipLZ: 0.5, hipRX: -0.6, kneeR: 0.5, kneeL: 0.3 })],
    [0.5, over(BASE, { lift: 0.38, yaw: 1.6, pitch: 0.9, barrel: 1.2, ...FLAIL, ...TUCKED, hipLX: 0.3, hipRX: -0.3, kneeL: 0.6, kneeR: 0.4 })],
    [0.7, over(ON_SIDE, { yaw: 1.6, lift: 0.03, ...TUCKED })],
    [0.85, over(ON_SIDE, { yaw: 1.6, ...TUCKED })],
  ],
};

function spinRusher(t: number): Fall {
  const hug = churn(over(BASE, { pitch: 0.4, neckX: -0.6, ...WRAP_ARMS, hipLX: -0.9, kneeL: 1.1, hipRX: 0.3, kneeR: 0.5 }), t, 0.22);
  return {
    lying: "front",
    keys: [
      [0, hug],
      [0.25, over(hug, { yaw: 0.6, spineY: 0.4, lift: 0.06, pitch: 0.55 })],
      [0.5, over(BASE, { lift: 0.32, pitch: 1.0, yaw: 1.0, ...WRAP_ARMS, hipLX: 0.2, hipRX: 0.4, kneeL: 0.6, kneeR: 0.9 })],
      [0.75, over(PRONE, { lift: 0.3, yaw: 1.2, ...WRAP_ARMS })],
    ],
  };
}

const BLINDSIDE_QB: Fall = {
  lying: "front",
  keys: [
    [0, over(BASE, { pitch: -0.1, spineX: -0.45, neckX: -0.7, ...FLAIL, shRX: -1.5, elR: -0.7, shRZ: 0.6, hipLX: 0.3, kneeL: 0.4 })],
    [0.15, over(BASE, { lift: 0.2, pitch: 0.6, spineX: -0.2, neckX: -0.5, shLX: -2.2, shRX: -2.0, elL: -0.3, elR: -0.6, hipLX: 0.4, hipRX: 0.6, kneeL: 0.6, kneeR: 0.4 })],
    [0.32, over(BASE, { lift: 0.14, pitch: 1.2, neckX: -0.9, shLX: -2.4, shRX: -2.3, shLZ: 0.5, shRZ: 0.5, elL: -0.25, elR: -0.3, hipLX: 0.2, hipRX: 0.3, kneeL: 0.4, kneeR: 0.5 })],
    [0.42, over(PRONE_BALL, { lift: 0.03 })],
    [0.58, PRONE_BALL],
  ],
};

const BLINDSIDE_RUSHER: Fall = {
  lying: "front",
  keys: [
    [0, over(BASE, { lift: 0.38, pitch: 0.9, neckX: -0.8, ...WRAP_ARMS, hipLX: 0.1, hipRX: 0.45, kneeL: 0.5, kneeR: 1.0 })],
    [0.2, over(BASE, { lift: 0.45, pitch: 1.15, neckX: -0.9, ...WRAP_ARMS, hipLX: 0.2, hipRX: 0.4, kneeL: 0.5, kneeR: 0.8 })],
    [0.42, over(PRONE, { lift: 0.32, ...WRAP_ARMS })],
  ],
};

/** The QB's side of a sack. */
export function sackedFall(kind: "spin" | "blindside"): Fall {
  return kind === "spin" ? SPIN_QB : BLINDSIDE_QB;
}

/** The rusher's side of a sack. */
export function sackerFall(kind: "spin" | "blindside", t: number): Fall {
  return kind === "spin" ? spinRusher(t) : BLINDSIDE_RUSHER;
}
