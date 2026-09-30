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
 * The key art. The icon looks down the road over the pack at the team
 * firing back from the truck, the moment a runner leaping at the
 * tailgate meets the shotgun. The poster is the wide chase from the side
 * of the road, as the rifle drops the nearest runner.
 */
export const STILLS: Record<"icon" | "poster", Still> = {
  icon: {
    story: 6.27,
    runUp: 0.6,
    seed: 21,
    camera: (t) => ({ position: [t.x + 4.6, 1.2, t.z + 8.6], lookAt: [t.x - 0.2, 1.3, t.z + 3.2], fov: 50, roll: 0.03 }),
  },
  poster: {
    story: 2.305,
    runUp: 0.6,
    seed: 22,
    camera: (t) => ({ position: [t.x - 7.2, 0.9, t.z + 3.6], lookAt: [t.x, 1.6, t.z + 4.4], fov: 50, roll: -0.03 }),
  },
};
