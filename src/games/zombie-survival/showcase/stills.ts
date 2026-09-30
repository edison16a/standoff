import type { CameraShot } from "./cinema/cinema-set";

type Point = { x: number; y: number; z: number };

/** One still: the story moment, the run up that fills the air with gunfire, and the camera. */
export interface Still {
  story: number;
  /** Seconds of the chase played before the moment, so flashes and sprays are in flight. */
  runUp: number;
  seed: number;
  /** Seats held on one chaser each, by id, so every gun points out at the dead. */
  aims?: Readonly<Record<number, number>>;
  /** How hard the key from the camera lights the scene, when brighter than the clip's. */
  key?: number;
  camera: (truck: Point) => CameraShot;
}

/**
 * The key art. The icon is a cover: from low on the road just off the
 * tailgate, the team faces the viewer as a runner leaps at the truck and
 * meets the shotgun in the air. The others are each held on a runner on
 * their own side, so every gun points out at the dead and none across
 * the team. The poster is the wide chase from the side of the road, as
 * the rifle drops the nearest runner.
 */
export const STILLS: Record<"icon" | "poster", Still> = {
  icon: {
    story: 6.365,
    runUp: 0.6,
    seed: 21,
    // The shotgun keeps the story's own kill on the leaper. The right hand guns take the runner reaching in on the right.
    aims: { 2: 10, 3: 13, 4: 10 },
    key: 40,
    camera: (t) => ({ position: [t.x + 2.4, 0.3, t.z + 6], lookAt: [t.x - 0.3, 1.5, t.z + 2], fov: 52, roll: 0.06 }),
  },
  poster: {
    story: 2.305,
    runUp: 0.6,
    seed: 22,
    camera: (t) => ({ position: [t.x - 7.2, 0.9, t.z + 3.6], lookAt: [t.x, 1.6, t.z + 4.4], fov: 50, roll: -0.03 }),
  },
};
