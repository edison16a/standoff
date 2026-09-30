import type { Cut, Place } from "./timeline";

/** Ahead of the runner and low, looking back past them at whoever is behind. */
const FRONT_LOW: Place = { at: [-1.1, 0.55, -4.6], look: [0.1, 1.25, 1.5], fov: 44 };
/** Alongside, a little ahead, at hip height. */
const SIDE: Place = { at: [4, 1.1, -2.6], look: [0, 1.2, -0.6], fov: 46 };
/** Swung round ahead of a leap, looking up at it. */
const SIDE_AHEAD: Place = { at: [2.8, 0.4, -4.4], look: [0, 1.4, -0.4], fov: 50 };
/** Close under the runner, so they tower over the lens. */
const HERO: Place = { at: [1.4, 0.35, -3], look: [0.1, 1.1, 0], fov: 54 };
/** High ahead, looking down the rails at a flight over the trains. */
const SKY_AHEAD: Place = { at: [-2.2, 1.6, -6.5], look: [0, 0.4, 0], fov: 46 };

/**
 * Eight seconds that loop: the inspector and his dog on the runner's
 * heels, a leap over the rails in slow motion, super sneakers flipping
 * high, a run over the train roofs as a horn blares, a jetpack over the
 * trains, and one last leap.
 */
export const TRAILER: readonly Cut[] = [
  { seed: 7, from: 0.7, seconds: 1.5, angle: FRONT_LOW, to: { ...FRONT_LOW, at: [-0.9, 0.7, -3.6] } },
  { seed: 7, from: 4.15, seconds: 0.35, angle: SIDE },
  { seed: 7, from: 4.5, seconds: 1, rate: 0.3, angle: SIDE, to: SIDE_AHEAD },
  { seed: 20, from: 19.5, seconds: 0.4, pickups: "boots", angle: HERO },
  { seed: 20, from: 19.9, seconds: 1.2, rate: 0.35, pickups: "boots", angle: HERO, to: SIDE_AHEAD },
  { seed: 7, from: 20.4, seconds: 1.4, angle: "chase" },
  { seed: 31, from: 18.4, seconds: 1.3, pickups: "jetpack", angle: SKY_AHEAD, to: { ...SKY_AHEAD, at: [-1.4, 1.2, -5] } },
  { seed: 42, from: 23.2, seconds: 0.85, angle: HERO },
];
