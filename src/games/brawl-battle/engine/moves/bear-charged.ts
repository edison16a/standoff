import { box, both, hit } from "./build";
import type { ChargedSet } from "./types";

/**
 * Bear's charged moves, all armored while they wind up: a haymaker, a
 * two paw uppercut, a slam that sends shockwaves along the floor, a roar
 * that blows everyone in front away, and a leap that crashes down belly
 * first.
 */
export const BEAR_CHARGED: ChargedSet = {
  holdSide: {
    name: "Haymaker",
    frames: 52,
    sound: "slam",
    heavy: true,
    root: true,
    armor: [4, 20],
    motion: [{ frame: 14, vx: 5 }],
    hitboxes: [box(1.5, 1.3, 0.95, 16, 20, hit(18, 13, 0.23, 38))],
  },
  holdUp: {
    name: "Grizzly Uppercut",
    frames: 46,
    sound: "slam",
    heavy: true,
    root: true,
    armor: [4, 16],
    hitboxes: [box(0.6, 2.2, 0.9, 14, 19, hit(15, 12, 0.21, 85)), box(0.2, 2.9, 0.8, 14, 19, hit(15, 12, 0.21, 85))],
  },
  holdDown: {
    name: "Shockwave Slam",
    frames: 54,
    sound: "slam",
    heavy: true,
    root: true,
    armor: [6, 22],
    hitboxes: [box(0, 0.4, 1.1, 20, 24, hit(13, 10, 0.18, 70))],
    projectiles: [
      { frame: 21, x: 1.4, y: 0.35, vx: 13, vy: 0, r: 0.5, life: 32, ...hit(9, 9, 0.14, 60) },
      { frame: 21, x: -1.4, y: 0.35, vx: -13, vy: 0, r: 0.5, life: 32, ...hit(9, 9, 0.14, 60) },
    ],
  },
  holdHeavy: {
    name: "Roar",
    frames: 50,
    sound: "slam",
    heavy: true,
    root: true,
    armor: [4, 14],
    hitboxes: [box(1.4, 1.3, 1.0, 14, 24, hit(6, 14, 0.12, 25)), box(2.8, 1.3, 1.1, 14, 24, hit(6, 14, 0.12, 25))],
  },
  holdHeavyDown: {
    name: "Meteor Belly",
    frames: 60,
    sound: "slam",
    heavy: true,
    root: true,
    armor: [1, 40],
    motion: [
      { frame: 8, vx: 0, vy: 12, set: true },
      { frame: 24, vy: -22, set: true },
    ],
    hitboxes: [box(0, 0.3, 1.0, 24, 34, hit(13, 8, 0.17, -80), 0), ...both(1.8, 0.4, 1.0, 36, 40, hit(14, 11, 0.2, 55), 1)],
  },
};
