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

/** Sunny Shores, seed 9: the pack takes the boost pads side by side, flies the lagoon jump, and two are iced in mid air. */
const LAGOON = { map: "beach", seed: 9 } as const;

/** Neo City, seed 4: a Star Orb spins out the leader, then the flyover jump with an Ice Blast, a Nitro and an orb in the air. */
const CITY = { map: "city", seed: 4 } as const;

/**
 * The loop runs its shots in turn and starts again, like a trailer: low
 * behind the pack through the boost pads, a cut on take off to a camera
 * beyond the lagoon as the pack flies at it, then Neo City. The icon and
 * the poster each stop on one moment of the jump.
 */
export const PLANS: Record<ShowcaseView, Plan> = {
  loop: {
    shots: [
      { ...LAGOON, from: 23.2, length: 2.1, rig: { kind: "chase", back: 7, side: -1.8, height: 1.3, fov: 58 } },
      { ...LAGOON, from: 25.5, length: 2.1, rig: { kind: "post", at: 0.662, d: -2, height: 1.4, frame: 10 } },
      { ...CITY, from: 21.9, length: 3.8, rig: { kind: "chase", back: 6.5, side: 1.8, height: 1.5, fov: 60 } },
    ],
  },
  // The whole pack in the air over the lagoon, an Ice Blast bursting on Nova.
  poster: { shots: [{ ...LAGOON, from: 22.8, length: 3, rig: { kind: "hero", kart: 3, angle: -0.8, dist: 9, height: 1.6, aim: 0.2, fov: 50 } }], freeze: 2.72 },
  // Blaze at the top of the jump, high in the square over the logo, with the others flying behind.
  icon: { shots: [{ ...LAGOON, from: 22.8, length: 3, rig: { kind: "hero", kart: 0, angle: -0.5, dist: 5.5, height: 0.6, aim: -0.5, fov: 52 } }], freeze: 1.25 },
};

export function planLength(plan: Plan): number {
  return plan.shots.reduce((sum, shot) => sum + shot.length, 0);
}
