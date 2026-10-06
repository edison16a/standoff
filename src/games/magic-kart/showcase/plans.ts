import type { ShowcaseView } from "@/platform/games/game-api";
import type { Plan, Rig } from "./shots";

/**
 * Magma Peak, seed 7: the pack hits the boost pads side by side, Nova's
 * orb catches Blaze on the ramp, all four gliders open over the lava and
 * Pip's orb knocks Mochi about in mid air, all inside three seconds.
 */
const LAVA = { map: "volcano", seed: 7 } as const;

/** Magma Peak, seed 53: Blaze comes out of a power slide on a turbo at 12.75 s, the pack right behind him. */
const SLIDE = { map: "volcano", seed: 53 } as const;

/** Star Ring, seed 6: all four gliders open within a tenth of a second, in front of the ringed planet. */
const STARS = { map: "space", seed: 6 } as const;

/** Neo City, seed 1: the pack hits the first row of boxes together and Pip smashes the double box at 5.65 s. */
const DOUBLE = { map: "city", seed: 1 } as const;

/** Star Ring, seed 12: all four gliders up by 20.7 s, then Mochi takes the double box in the sky at 20.75 s. */
const SKY = { map: "space", seed: 12 } as const;

/** Low on the far side of Neo City's double box, looking back down the road as Pip drives into it. */
const DOUBLE_WIDE: Rig = { kind: "spot", at: 0.1445, d: 7.5, height: 0.9, look: { at: 0.14, d: 4.5, height: 1.8 }, fov: 48 };

/** Just past the box, looking down at the road, so Pip bursts out of the glass straight at the lens. */
const DOUBLE_HEAD_ON: Rig = { kind: "spot", at: 0.144, d: 4, height: 1, look: { at: 0.1412, d: 4.6, height: 0.3 }, fov: 54 };

/** Level with the double box in the sky, so the gliders fly at it over the stars. */
const SKY_BOX: Rig = { kind: "spot", at: 0.4575, d: -6, height: 6, look: { at: 0.452, d: -3.4, height: 6.2 }, fov: 50 };

/**
 * The capture tool lets the showcase run this long before it records,
 * so the first shot starts here and the clip opens on it.
 */
const WARMUP = 3;

/**
 * The loop is a wordless trailer: fast cuts that each land on a big
 * moment, half of them in slow motion, low cameras close to the new
 * karts and both kinds of double box breaking. It runs exactly the eight
 * seconds the tool records, so the extra second it fades over the start
 * is the start again and the loop has no seam. Angles are from the road,
 * so a kart spun by a hit does not whirl the camera.
 */
export const PLANS: Record<ShowcaseView, Plan> = {
  loop: {
    lead: WARMUP,
    shots: [
      // Low beside the boost pads as the pack roars past with flames out.
      { ...LAVA, from: 19.4, length: 0.8, rig: { kind: "post", at: 0.432, d: 8, height: 0.6, frame: 14 } },
      // Half speed: the glass double box towers over the road as Pip drives in and it bursts.
      { ...DOUBLE, from: 5.25, length: 1, rate: 0.5, rig: DOUBLE_WIDE },
      // Pip comes out of the burst at the lens. It cuts before he reaches the camera.
      { ...DOUBLE, from: 5.7, length: 0.4, rate: 0.3, rig: DOUBLE_HEAD_ON },
      // Half speed, circling low round Blaze's nose as he comes out of a slide on a turbo.
      { ...SLIDE, from: 12.45, length: 1, rate: 0.5, rig: { kind: "hero", kart: 0, angle: 0.8, dist: 3.2, height: 0.3, aim: 0.5, fov: 50, road: true, orbit: -0.5 } },
      // Half speed, low beside the pack: the orb hits Blaze as they launch off the ramp over the lava.
      // Kept clear of the ramp, which a camera in front of Blaze would sit inside.
      { ...LAVA, from: 20.15, length: 1, rate: 0.5, rig: { kind: "hero", kart: 0, angle: 1, dist: 7, height: 1.5, aim: 1.2, fov: 55, road: true } },
      // Under Blaze's wing, circling, the sunset behind. It cuts before he drops out of the picture.
      { ...LAVA, from: 20.65, length: 0.9, rig: { kind: "hero", kart: 0, angle: -1.1, dist: 5, height: -1.6, aim: 0.8, fov: 55, road: true, orbit: 0.4 } },
      // Half speed: Pip's orb knocks Mochi about under the wing.
      { ...LAVA, from: 21.25, length: 0.9, rate: 0.5, rig: { kind: "hero", kart: 3, angle: 0.9, dist: 5, height: 0.6, aim: 0.8, fov: 50, road: true } },
      // Half speed: the gliders fly at the double box among the stars and Mochi takes it.
      { ...SKY, from: 20.4, length: 0.9, rate: 0.5, rig: SKY_BOX },
      // Under the four wings, circling slowly past the ringed planet.
      { ...STARS, from: 19.4, length: 1.1, rig: { kind: "hero", kart: 3, angle: -2.2, dist: 6, height: -1.2, aim: 1.2, fov: 58, road: true, orbit: 0.3 } },
    ],
  },
  // Three gliders bearing down on the glass double box among the stars.
  poster: { shots: [{ ...SKY, from: 20.4, length: 1, rig: SKY_BOX }], freeze: 0.25 },
  // The cover: Pip bursting out of the double box at the viewer, glass and gold sparks flying, Neo City behind.
  icon: { shots: [{ ...DOUBLE, from: 5.4, length: 1, rig: DOUBLE_HEAD_ON }], freeze: 0.255 },
};
