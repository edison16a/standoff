import type { CameraShot } from "./cinema/cinema-set";

type Point = { x: number; y: number; z: number };

/** One still: the story moment, the run up that fills the air with gunfire, and the camera. */
export interface Still {
  story: number;
  /** Seconds of the chase played before the moment, so flashes and sprays are in flight. */
  runUp: number;
  seed: number;
  camera: (truck: Point) => CameraShot;
}

/**
 * The key art. The icon is the moment a runner leaping at the tailgate
 * meets the shotgun, seen low from the road behind with the pack around
 * the camera. The poster is the wide chase: the truck head on through
 * the fog, the team firing back, the dead pouring after it.
 */
export const STILLS: Record<"icon" | "poster", Still> = {
  icon: {
    story: 6.38,
    runUp: 0.6,
    seed: 21,
    camera: (t) => ({ position: [t.x + 1.7, 0.75, t.z + 8.2], lookAt: [t.x - 0.1, 1.75, t.z + 2.2], fov: 50, roll: 0.05 }),
  },
  poster: {
    story: 2.32,
    runUp: 0.6,
    seed: 22,
    camera: (t) => ({ position: [t.x - 4.6, 0.7, t.z - 3.4], lookAt: [t.x + 0.3, 1.6, t.z + 3.4], fov: 40, roll: -0.03 }),
  },
};
