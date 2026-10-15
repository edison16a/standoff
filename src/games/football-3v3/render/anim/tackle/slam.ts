import { over } from "../pose";
import { BASE, FLAIL, PRONE, PUSH_UP, SUPINE, TUCKED, WRAP_ARMS } from "./body-keys";
import type { Fall } from "./carrier";

/**
 * The slam: a tackler arriving at full power drives his shoulder
 * through the carrier's chest. The carrier is lifted clean off his feet
 * and thrown back down the hit's line, lands flat on his back with the
 * legs still up and bounces once; the hitter flies through with him,
 * lands on top and pushes himself up while the man is still down.
 * Authored head on, in seconds from the hit (tackle-moves.ts holds the
 * bodies together on the same clock).
 */

/** Blown up: the chest caved, the arms thrown forward and wide, the head snapped down. */
const STRUCK = over(BASE, { pitch: -0.35, spineX: -0.45, neckX: 0.55, ...FLAIL, ...TUCKED, shLX: -1.6, shLZ: 1.0, hipLX: -0.4, hipRX: -0.2, kneeL: 0.5, kneeR: 0.4 });

export const SLAM_CARRIER: Fall = {
  lying: "back",
  keys: [
    [0, STRUCK],
    [0.12, over(BASE, { lift: 0.45, pitch: -0.8, spineX: -0.3, neckX: 0.5, ...FLAIL, ...TUCKED, hipLX: -1.1, hipRX: -0.7, kneeL: 0.5, kneeR: 0.7 })],
    [0.3, over(BASE, { lift: 0.4, pitch: -1.25, spineX: -0.15, neckX: 0.6, ...FLAIL, ...TUCKED, hipLX: -1.45, hipRX: -1.05, kneeL: 0.4, kneeR: 0.6 })],
    [0.42, over(SUPINE, { lift: 0.06, ...TUCKED, shLX: 0.2, shLZ: 1.3, hipLX: -1.1, hipRX: -0.8, kneeL: 0.4, kneeR: 0.5 })],
    [0.55, over(SUPINE, { lift: 0.12, ...TUCKED, shLZ: 1.1, neckX: 0.7, hipLX: -0.7, hipRX: -0.4 })],
    [0.78, over(SUPINE, TUCKED)],
  ],
};

/** The hitter, from his side: shoulder in, launched through, down on top, then up off him. */
export const SLAM_TACKLER: Fall = {
  lying: "front",
  keys: [
    [0, over(BASE, { lift: 0.15, pitch: 0.75, spineX: 0.2, neckX: -0.6, ...WRAP_ARMS, hipLX: -1.0, kneeL: 1.1, hipRX: 0.6, kneeR: 0.3 })],
    [0.15, over(BASE, { lift: 0.42, pitch: 1.0, neckX: -0.8, ...WRAP_ARMS, hipLX: 0.2, hipRX: 0.5, kneeL: 0.4, kneeR: 0.8 })],
    [0.4, over(BASE, { lift: 0.36, pitch: 1.25, neckX: -0.8, ...WRAP_ARMS, hipLX: 0.15, hipRX: 0.3, kneeL: 0.5, kneeR: 0.7 })],
    [0.6, over(PRONE, { lift: 0.3, ...WRAP_ARMS, shLX: -1.9, shRX: -1.9 })],
    [0.82, over(PUSH_UP, { lift: 0.22 })],
  ],
};
