import type { ShotPreset } from "./presets";

/**
 * How each ending is thrown: the authored aim the solver starts from.
 * Long is metres past the shooter's normal aim in the rim plane (or up
 * the glass for a bank), side is metres off the line, and the arc and
 * the backspin can be raised or flattened. The ranges come from flying
 * grids of releases through the ball physics and reading where each
 * ending lives: a soft high arc a touch short kisses the front iron and
 * drops, a flat hard one past the middle clangs off the back and goes
 * long, a ball landing on top of the ring rolls round it.
 */

export interface Recipe {
  /** Thrown at the square on the glass. */
  glass?: boolean;
  long: readonly [number, number];
  side: readonly [number, number];
  /** Long may go either way, and the release timing picks which (`lean`). */
  either?: boolean;
  /** Metres added to the peak of the arc. */
  apex?: number;
  /** Scale on the backspin. */
  spin?: number;
  /** Side spin in radians a second, either way, so the ball tilts as it flies. */
  tilt?: number;
  /** The roll round the ring, for a toilet bowl. */
  ride?: { laps: readonly [number, number]; drop: "in" | "out" };
}

export const RECIPES: Record<ShotPreset, Recipe> = {
  swish: { long: [-0.05, 0.04], side: [0, 0.035], tilt: 0.6 },
  bank: { glass: true, long: [-0.04, 0.06], side: [0, 0.05] },
  frontRimIn: { long: [-0.2, -0.05], side: [0, 0.12], apex: 0.15 },
  backRimIn: { long: [0.0, 0.15], side: [0, 0.09], apex: 0.05 },
  rattleIn: { long: [0.1, 0.25], side: [0, 0.1], either: true, apex: 0.3, spin: 1.4 },
  rollIn: { long: [-0.04, 0.08], side: [0.19, 0.25], apex: 0.15, spin: 0.6, tilt: 2, ride: { laps: [0.7, 1.7], drop: "in" } },
  rollOut: { long: [-0.04, 0.08], side: [0.19, 0.25], apex: 0.15, spin: 0.6, tilt: 2, ride: { laps: [0.5, 1.3], drop: "out" } },
  rimOut: { long: [0.15, 0.3], side: [0, 0.2], either: true, tilt: 1 },
  backIron: { long: [0.3, 0.5], side: [0, 0.08], apex: 0.2, spin: 0.8 },
  glassOut: { glass: true, long: [0.2, 0.5], side: [0.26, 0.4] },
  airball: { long: [-0.85, -0.45], side: [0, 0.45], tilt: 2 },
};
