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
 * The key art. The icon is a cover: from low in the road behind the pack,
 * the team faces the viewer from the back of the truck, every gun turned
 * down on the dead crowding the tailgate, each at one on its own side so
 * none points across the team. The poster is the wide chase from the
 * side of the road, as the rifle drops the nearest runner.
 */
export const STILLS: Record<"icon" | "poster", Still> = {
  icon: {
    story: 7.12,
    runUp: 0.6,
    seed: 21,
    aims: { 1: 14, 2: 10, 3: 13, 4: 2 },
    key: 32,
    camera: (t) => ({ position: [t.x + 0.3, 1.8, t.z + 16], lookAt: [t.x - 0.05, 1.6, t.z + 2.1], fov: 17, roll: 0.03 }),
  },
  poster: {
    story: 2.305,
    runUp: 0.6,
    seed: 22,
    camera: (t) => ({ position: [t.x - 7.2, 0.9, t.z + 3.6], lookAt: [t.x, 1.6, t.z + 4.4], fov: 50, roll: -0.03 }),
  },
};
