import type { ShowcaseView } from "@/platform/games/game-api";

type Triple = readonly [number, number, number];

/** Where the showcase camera stands at a moment, `t` seconds into the scene. */
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

/** One view of the showcase: which round, which moment, and the camera. */
export interface ShowcasePlan {
  seed: number;
  /** The round time the scene opens on. Everything before it plays out unseen, so the booth is already busy. */
  start: number;
  /**
   * When the players start shooting. Four good shots clear ducks faster
   * than the lanes bring them, so they wait until just before the scene
   * and the booth is full when it opens.
   */
  openFire: number;
  /** Stills hold on their first moment. The loop plays on. */
  hold: boolean;
  golden: GoldenCue | null;
  camera(t: number): CameraShot;
}

/**
 * The capture tool films the loop from about 3 seconds in, for 8 seconds,
 * then fades the next second over the start. The camera sways on an 8
 * second beat, so the join lands where it began.
 */
const LOOP_S = 8;

/**
 * The stills share one round. The players open fire just before, so the
 * booth is still full, and a golden duck crosses the middle to be shot
 * at about 35.65 seconds.
 */
const STILL = {
  seed: 11,
  openFire: 32.5,
  hold: true,
  golden: { lane: "back", at: 33, x: -1.6, shootAt: 34.3 },
} as const;

export const PLANS: Record<ShowcaseView, ShowcasePlan> = {
  loop: {
    seed: 11,
    start: 30,
    openFire: 28.5,
    hold: false,
    // Rides in from the left early in the clip, crosses the booth, and is shot near the end.
    golden: { lane: "back", at: 33.4, x: -5.4, shootAt: 38.6 },
    camera(t) {
      const sway = Math.sin((t / LOOP_S) * Math.PI * 2);
      const breathe = Math.cos((t / LOOP_S) * Math.PI * 2);
      return { position: [0.3 * sway, 1.96, 6.05 + 0.15 * breathe], lookAt: [0.12 * sway, 1.66, -1], fov: 40 };
    },
  },
  // A beat after the golden duck is hit: its points float up over a busy booth.
  poster: { ...STILL, start: 35.8, camera: () => ({ position: [0, 1.92, 6.0], lookAt: [0, 1.6, -1], fov: 38 }) },
  // Just before: a laser dot on the golden duck, seen close.
  icon: { ...STILL, start: 35.6, camera: () => ({ position: [0.75, 1.5, 0.9], lookAt: [0.85, 0.8, -1.62], fov: 50 }) },
};
