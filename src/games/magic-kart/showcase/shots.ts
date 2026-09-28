import type { ShowcaseView } from "@/platform/games/game-api";
import type { TrackId } from "../tracks";
import type { Framing, SweepKey } from "./sweep";

/** Where the camera sits for a shot. Distances are metres, fields of view degrees. */
export type Rig =
  /** Behind the pack, low, a little to one side. */
  | ({ kind: "chase" } & Framing)
  /**
   * Behind the pack like the chase, gliding from one framing to the next
   * at the race times of its keys, so one long take can swing wide
   * through a drift and climb as the gliders open.
   */
  | { kind: "sweep"; keys: readonly SweepKey[] }
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

/**
 * Sunny Shores, seed 99: the tightest pack of 200 seeds tried. The pack
 * power slides through the bends side by side with turbos firing, hits
 * the boost pads together and all four gliders open as one over the lagoon.
 */
const SLIDE = { map: "beach", seed: 99 } as const;

/**
 * The capture tool warms the loop up for this long before it records 8
 * seconds, plus one more that it fades over the start. The loop's shot
 * begins this much early, so the recording lands on the racing picked
 * for it, and runs long, so no cut falls inside the recording.
 */
const WARMUP = 3;
/** Race seconds where the recording begins: the straight just before the bend. */
const TAKE = 19;

/**
 * The loop is one unbroken take behind the pack. It starts low on one
 * side, swings wide as the pack slides through the bend, tucks in low
 * for the boost pads, then climbs behind the gliders as they open over
 * the lagoon. The last second fades into the first, so the take runs
 * round without a cut. The icon and the poster each stop on one moment
 * of the glide.
 */
export const PLANS: Record<ShowcaseView, Plan> = {
  loop: {
    shots: [
      {
        ...SLIDE,
        from: TAKE - WARMUP,
        length: WARMUP + 10,
        rig: {
          kind: "sweep",
          keys: [
            { at: TAKE, back: 9.5, side: 2.5, height: 2.8, fov: 56 },
            { at: 21.5, back: 8.5, side: -3, height: 2.4, fov: 58 },
            { at: 24.3, back: 9, side: -1, height: 2.5, fov: 57 },
            { at: 26, back: 11, side: 0.5, height: 4.8, fov: 60 },
            { at: 28, back: 10.5, side: 2, height: 4.2, fov: 58 },
          ],
        },
      },
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
