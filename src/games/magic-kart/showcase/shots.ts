import type { ShowcaseView } from "@/platform/games/game-api";
import type { TrackId } from "../tracks";

/** Where the camera sits for a shot. Distances are metres, fields of view degrees. */
export type Rig =
  /** Behind the pack, low, a little to one side. */
  | { kind: "chase"; back: number; side: number; height: number; fov: number }
  /**
   * Planted beside the road at a point on the lap, turning to follow the
   * pack and zooming like a television camera, so the pack fills about
   * `frame` metres of the picture however far off it is.
   */
  | { kind: "post"; at: number; d: number; height: number; frame: number }
  /**
   * Close on one kart from a corner, turning with it. Angle 0 is dead
   * ahead of it. The camera looks at a point `aim` metres above the kart,
   * so a low aim lifts the kart up the picture.
   */
  | { kind: "hero"; kart: number; angle: number; dist: number; height: number; aim: number; fov: number };

/**
 * A few seconds of one seeded race with four computer karts. The same
 * seed always plays out the same way, so each shot was picked by running
 * many seeds and keeping the liveliest moments: throws landing, the pack
 * in the air together and places changing hands.
 */
export interface Shot {
  map: TrackId;
  seed: number;
  /** Race seconds after the start signal where the shot begins. */
  from: number;
  length: number;
  rig: Rig;
}

export interface Plan {
  shots: readonly Shot[];
  /** For a still: seconds into its one shot where time stops. */
  freeze?: number;
}

/** Sunny Shores, seed 36: the pack hits the boost pads and flies the lagoon jump, and a Star Orb spins out the leader in mid air. */
const LAGOON = { map: "beach", seed: 36 } as const;

/** Neo City, seed 4: the whole pack power slides through a bend side by side, turbos fire, an orb lands, and two more drift out on turbos and a Nitro. */
const CITY = { map: "city", seed: 4 } as const;

/**
 * The loop runs its shots in turn and starts again, like a trailer: low
 * behind the pack through the boost pads, a cut on take off to a camera
 * beyond the lagoon as the pack flies at it, then the drift battle in Neo
 * City. The icon and the poster each stop on one moment of the jump.
 */
export const PLANS: Record<ShowcaseView, Plan> = {
  loop: {
    shots: [
      { ...LAGOON, from: 25.2, length: 1.7, rig: { kind: "chase", back: 9.5, side: -1.5, height: 2.7, fov: 56 } },
      { ...LAGOON, from: 26.9, length: 2.2, rig: { kind: "post", at: 0.684, d: -3, height: 1.4, frame: 9 } },
      { ...CITY, from: 32.2, length: 4.1, rig: { kind: "chase", back: 9.5, side: 2.4, height: 2.9, fov: 56 } },
    ],
  },
  // The whole pack in the air over the lagoon.
  poster: { shots: [{ ...LAGOON, from: 26, length: 3, rig: { kind: "hero", kart: 3, angle: -0.8, dist: 9, height: 1.6, aim: 0.2, fov: 50 } }], freeze: 1.35 },
  // Blaze at the top of the jump, high in the square over the logo, with the others flying behind.
  icon: { shots: [{ ...LAGOON, from: 26, length: 3, rig: { kind: "hero", kart: 0, angle: -0.5, dist: 5.5, height: 0.6, aim: -0.5, fov: 52 } }], freeze: 1.3 },
};

export function planLength(plan: Plan): number {
  return plan.shots.reduce((sum, shot) => sum + shot.length, 0);
}
