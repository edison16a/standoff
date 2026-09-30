import type { ShowcaseView } from "@/platform/games/game-api";
import type { Plan } from "./shots";

/**
 * Magma Peak, seed 7: the pack hits the boost pads side by side, Nova's
 * orb catches Blaze on the ramp, all four gliders open over the lava and
 * Pip's orb knocks Mochi about in mid air, all inside three seconds.
 */
const LAVA = { map: "volcano", seed: 7 } as const;

/** Neo City, seed 26: three karts power slide through the first bend together and fire their turbos. */
const NEON = { map: "city", seed: 26 } as const;

/** Star Ring, seed 6: all four gliders open within a tenth of a second, in front of the ringed planet. */
const STARS = { map: "space", seed: 6 } as const;

/**
 * The capture tool lets the showcase run this long before it records,
 * so the first shot starts here and the clip opens on it.
 */
const WARMUP = 3;

/**
 * The loop is a trailer: fast cuts that each land on a big moment, two
 * of them in slow motion, low cameras close to the karts. It runs exactly
 * the eight seconds the tool records, so the extra second it fades over
 * the start is the start again and the loop has no seam. Angles are from
 * the road, so a kart spun by a hit does not whirl the camera.
 */
export const PLANS: Record<ShowcaseView, Plan> = {
  loop: {
    lead: WARMUP,
    shots: [
      // Low beside the boost pads as the pack roars past with flames out.
      { ...LAVA, from: 19.4, length: 0.8, rig: { kind: "post", at: 0.432, d: 8, height: 0.6, frame: 14 } },
      // Half speed, low in front of Blaze: the orb hits, and the pack launches off the ramp overhead.
      { ...LAVA, from: 20.15, length: 1.5, rate: 0.5, rig: { kind: "hero", kart: 0, angle: 0.35, dist: 7, height: 0.2, aim: 1.5, fov: 55, road: true } },
      // Under Blaze's wing, circling, the sunset behind.
      { ...LAVA, from: 20.9, length: 1.3, rig: { kind: "hero", kart: 0, angle: -1.2, dist: 5, height: -1.6, aim: 0.8, fov: 55, road: true, orbit: 0.6 } },
      // Half speed: Pip's orb knocks Mochi about under the wing.
      { ...LAVA, from: 21.25, length: 0.9, rate: 0.5, rig: { kind: "hero", kart: 3, angle: 0.9, dist: 5, height: 0.6, aim: 0.8, fov: 50, road: true } },
      // Pip sliding through a neon bend into a turbo.
      { ...NEON, from: 7.3, length: 1.2, rig: { kind: "hero", kart: 1, angle: 2.5, dist: 4.5, height: 0.4, aim: 0.6, fov: 52, road: true } },
      // Behind the pack as the gliders open among the stars.
      { ...STARS, from: 18.6, length: 1, rig: { kind: "chase", back: 8, side: 2, height: 1.5, fov: 60 } },
      // Under the four wings, circling slowly past the ringed planet.
      { ...STARS, from: 19.4, length: 1.3, rig: { kind: "hero", kart: 3, angle: -2.2, dist: 6, height: -1.2, aim: 1.2, fov: 58, road: true, orbit: 0.3 } },
    ],
  },
  // The pack launching off the ramp over the camera, frozen as the orb's stars burst over Blaze.
  poster: { shots: [{ ...LAVA, from: 20.15, length: 3, rig: { kind: "hero", kart: 0, angle: 0.35, dist: 7, height: 0.2, aim: 1.5, fov: 55, road: true } }], freeze: 0.3 },
  // Blaze under the wing over the lava, seen from below against the sunset.
  icon: { shots: [{ ...LAVA, from: 20.9, length: 3, rig: { kind: "hero", kart: 0, angle: -0.9, dist: 5, height: -1.6, aim: 0.8, fov: 55, road: true } }], freeze: 0.6 },
};
