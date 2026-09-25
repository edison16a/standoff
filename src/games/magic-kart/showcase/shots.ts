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

/** Sunny Shores, seed 36: the pack hits the boost pads, all four gliders open together over the lagoon, a cube is snatched in mid air and throws fly. */
const LAGOON = { map: "beach", seed: 36 } as const;

/** Neo City, seed 17: the pack power slides through the corners side by side, turbos firing one after another, and an orb lands. */
const CITY = { map: "city", seed: 17 } as const;

/**
 * The loop runs its shots in turn and starts again, like a trailer: low
 * behind the pack through the boost pads, a cut on take off to a camera
 * high behind as the gliders open over the lagoon, a close up of Pip
 * gliding in with iced wheels, then the drift battle in Neo City. The
 * icon and the poster each stop on one moment of the glide.
 */
export const PLANS: Record<ShowcaseView, Plan> = {
  loop: {
    shots: [
      { ...LAGOON, from: 25.5, length: 1.6, rig: { kind: "chase", back: 9.5, side: -1.5, height: 2.7, fov: 56 } },
      { ...LAGOON, from: 27.1, length: 1.4, rig: { kind: "chase", back: 11, side: -3, height: 4.6, fov: 58 } },
      { ...LAGOON, from: 28.5, length: 1.3, rig: { kind: "hero", kart: 1, angle: -2.4, dist: 7, height: 0.4, aim: 1.2, fov: 50 } },
      { ...CITY, from: 25.5, length: 3.7, rig: { kind: "chase", back: 9.5, side: 2.4, height: 2.9, fov: 56 } },
    ],
  },
  // Nova and Blaze gliding side by side over the lagoon.
  poster: { shots: [{ ...LAGOON, from: 26.5, length: 3, rig: { kind: "hero", kart: 2, angle: -0.9, dist: 12, height: 2.2, aim: 1.4, fov: 50 } }], freeze: 1.2 },
  // Blaze under the wing, high in the square over the logo, with Nova gliding behind.
  icon: { shots: [{ ...LAGOON, from: 26.5, length: 3, rig: { kind: "hero", kart: 0, angle: -0.5, dist: 6.5, height: 0.4, aim: 0.6, fov: 52 } }], freeze: 1.3 },
};

export function planLength(plan: Plan): number {
  return plan.shots.reduce((sum, shot) => sum + shot.length, 0);
}
