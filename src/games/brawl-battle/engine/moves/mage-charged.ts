import { box, both, flurry, hit } from "./build";
import type { ChargedSet } from "./types";

/**
 * Mage's charged moves: a big slow orb that grows with the charge, a
 * pillar of light overhead, a ring of frost, an arcane beam that holds
 * across half the stage, and stars that fall on the space ahead.
 */
export const MAGE_CHARGED: ChargedSet = {
  holdSide: {
    name: "Big Orb",
    frames: 40,
    sound: "magic",
    heavy: true,
    root: true,
    hover: true,
    hitboxes: [],
    projectiles: [{ frame: 12, x: 1.0, y: 1.2, vx: 11, vy: 0, r: 0.55, life: 45, look: "orb", ...hit(8, 9, 0.14, 35) }],
  },
  holdUp: {
    name: "Light Pillar",
    frames: 44,
    sound: "magic",
    heavy: true,
    root: true,
    hitboxes: [box(0.3, 1.5, 0.7, 12, 18, hit(13, 10, 0.19, 88)), box(0.3, 2.6, 0.8, 12, 18, hit(13, 10, 0.19, 88)), box(0.3, 3.6, 0.8, 12, 18, hit(13, 10, 0.19, 88))],
  },
  holdDown: {
    name: "Frost Ring",
    frames: 42,
    sound: "magic",
    heavy: true,
    root: true,
    hitboxes: [...both(1.3, 0.4, 0.8, 12, 16, hit(12, 10, 0.18, 50)), box(0, 0.6, 0.9, 12, 16, hit(12, 10, 0.18, 70))],
  },
  holdHeavy: {
    name: "Arcane Beam",
    frames: 56,
    sound: "magic",
    heavy: true,
    root: true,
    hover: true,
    hitboxes: [
      ...flurry(3, 16, 6, 4, [[1.4, 1.2, 0.5], [2.3, 1.2, 0.5], [3.2, 1.2, 0.5], [4.1, 1.2, 0.5]], hit(3, 2, 0, 20)),
      ...[1.4, 2.3, 3.2, 4.1].map((x) => box(x, 1.2, 0.55, 34, 37, hit(7, 10, 0.15, 32), 3)),
    ],
  },
  holdHeavyDown: {
    name: "Star Fall",
    frames: 50,
    sound: "magic",
    heavy: true,
    root: true,
    hover: true,
    hitboxes: [],
    projectiles: [
      { frame: 14, x: 1.8, y: 6, vx: 0, vy: -16, r: 0.5, life: 40, look: "star", ...hit(7, 8, 0.13, 60) },
      { frame: 20, x: 3.0, y: 6, vx: 0, vy: -16, r: 0.5, life: 40, look: "star", ...hit(7, 8, 0.13, 60) },
      { frame: 26, x: 4.2, y: 6, vx: 0, vy: -16, r: 0.5, life: 40, look: "star", ...hit(7, 8, 0.13, 60) },
    ],
  },
};
