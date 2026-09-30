type Triple = readonly [number, number, number];

/**
 * The round advances in steps this long, whatever the frame rate, so
 * every run plays out the same. Fine enough that a shot slowed to a
 * sixth of real time still moves on every filmed frame.
 */
export const STEP_S = 1 / 600;

/** Where the showcase camera stands for one frame. */
export interface CameraShot {
  position: Triple;
  lookAt: Triple;
  /** Vertical field of view, in degrees. */
  fov: number;
}

/** The golden duck the plan puts on stage, and when the players may shoot it. Times are round seconds. */
export interface GoldenCue {
  lane: "back" | "front";
  at: number;
  /** The duck on the lane nearest this spot turns golden. Past the posts, it rides in unseen. */
  x: number;
  shootAt: number;
}

/** The round the showcase plays: its seed, when the players open fire, and the golden duck. */
export interface RoundPlan {
  seed: number;
  /**
   * When the players start shooting. Four good shots clear ducks faster
   * than the lanes bring them, so they wait until just before the action
   * and the booth is full.
   */
  openFire: number;
  golden: GoldenCue | null;
}

/**
 * Every view films the same round, so the trailer's moments and the
 * stills are the same shots. Its seed and cue put a bull, a plate off
 * the top rail and the golden duck exactly where the edit wants them.
 */
export const ROUND: RoundPlan = {
  seed: 11,
  openFire: 28.5,
  // Rides in from the left, crosses the booth, and is shot at about 39.23 seconds.
  golden: { lane: "back", at: 33.4, x: -5.4, shootAt: 38.6 },
};

/** Where the golden duck is at a round time, near its moment. It rides the back lane at a steady pace. */
export function goldenX(time: number): number {
  return 1.012 + 1.084 * (time - 39);
}

/** Where the plate shot down at about 33.16 seconds is on its rail. */
export function plateX(time: number): number {
  return -0.72 + 2.62 * (time - 33);
}

/** One still: the round time it holds on and the camera. */
export interface Still {
  time: number;
  camera: CameraShot;
}

/**
 * The key art. The icon is a cover: down at the counter between the
 * guns, the cherry pump gun big in the foreground firing its BB at the
 * golden duck, the gold gun aimed in from the other side, and the
 * bullseye and striped canvas behind. Every gun points down the range.
 * The poster is the same moment from behind the four guns.
 */
export const STILLS: Record<"icon" | "poster", Still> = {
  icon: { time: 39.24, camera: { position: [-0.1, 1.1, 5.1], lookAt: [goldenX(39.24) - 0.2, 0.94, -1.62], fov: 38 } },
  poster: { time: 39.24, camera: { position: [0.35, 1.34, 4.4], lookAt: [goldenX(39.24), 1.12, -1.62], fov: 27 } },
};
