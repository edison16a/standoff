import type { Cut, Place } from "./timeline";

/** Ahead of the runner and low, looking back past them at the inspector and dog on their heels. */
const PURSUIT: Place = { at: [-1.6, 0.55, -4.2], look: [0.2, 1.3, 2], fov: 50 };
/** Alongside, a little ahead, at hip height. */
const SIDE: Place = { at: [4, 1.1, -2.6], look: [0, 1.2, -0.6], fov: 46 };
/** Swung round ahead of a leap, looking up at it. */
const SIDE_AHEAD: Place = { at: [2.8, 0.4, -4.4], look: [0, 1.4, -0.4], fov: 50 };
/** Close under the runner, so they tower over the lens. */
const HERO: Place = { at: [1.4, 0.35, -3], look: [0.1, 1.1, 0], fov: 54 };
/** Beside and below a jetpack flight, looking up past it at the sky and the rooftops. */
const FLY_BY: Place = { at: [2.6, -0.6, -2.4], look: [0, 0.9, 0], fov: 55 };

/**
 * Eight seconds that loop: the inspector and his dog on the runner's
 * heels, a leap over the rails in slow motion, super sneakers flipping
 * high, a run along the train roofs, a jetpack past the rooftops, and
 * one last leap.
 */
export const TRAILER: readonly Cut[] = [
  { seed: 7, from: 1, seconds: 1.5, clearLens: true, angle: PURSUIT, to: { at: [-1.2, 0.45, -3.4], look: [0.2, 1.4, 2], fov: 52 } },
  { seed: 7, from: 4.15, seconds: 0.35, clearLens: true, angle: SIDE },
  { seed: 7, from: 4.5, seconds: 1, rate: 0.3, clearLens: true, angle: SIDE, to: SIDE_AHEAD },
  { seed: 20, from: 19.5, seconds: 0.4, pickups: "boots", angle: HERO },
  { seed: 20, from: 19.9, seconds: 1.2, rate: 0.35, pickups: "boots", angle: HERO, to: SIDE_AHEAD },
  { seed: 7, from: 20.4, seconds: 1.4, angle: "chase" },
  { seed: 11, from: 20.4, seconds: 1.3, pickups: "jetpack", angle: FLY_BY, to: { ...FLY_BY, at: [2.1, -0.4, -3.3] } },
  { seed: 42, from: 23.2, seconds: 0.85, clearLens: true, angle: HERO },
];
