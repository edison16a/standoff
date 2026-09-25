import { box, both, hit } from "./build";
import type { ChargedSet } from "./types";

/**
 * Samurai's charged moves: a flying slash that leaves the blade as a
 * crescent, a tall overhead cut, a whirlwind low spin, a lightning draw
 * that dashes clean through, and a cut into the floor that sends a wave
 * running out both ways.
 */
export const SAMURAI_CHARGED: ChargedSet = {
  holdSide: {
    name: "Flying Slash",
    frames: 40,
    sound: "slash",
    heavy: true,
    root: true,
    hitboxes: [box(1.1, 1.1, 0.6, 10, 12, hit(7, 7, 0.1, 35))],
    projectiles: [{ frame: 12, x: 1.3, y: 1.1, vx: 17, vy: 0, r: 0.55, life: 34, look: "crescent", ...hit(10, 10, 0.16, 35) }],
  },
  holdUp: {
    name: "Heaven Cut",
    frames: 40,
    sound: "slash",
    heavy: true,
    root: true,
    hitboxes: [box(1.1, 1.7, 0.7, 9, 14, hit(13, 10, 0.19, 85)), box(0, 2.6, 0.75, 9, 14, hit(13, 10, 0.19, 85)), box(-1.0, 1.7, 0.65, 9, 14, hit(13, 10, 0.19, 85))],
  },
  holdDown: {
    name: "Whirlwind",
    frames: 42,
    sound: "slash",
    heavy: true,
    root: true,
    hitboxes: [...both(1.6, 0.5, 0.7, 8, 10, hit(4, 4, 0.02, 70), 0), ...both(1.8, 0.5, 0.75, 14, 18, hit(12, 10, 0.19, 30), 1)],
  },
  holdHeavy: {
    name: "Lightning Draw",
    frames: 48,
    sound: "slash",
    heavy: true,
    root: true,
    landLag: 14,
    invincible: [8, 15],
    motion: [
      { frame: 8, vx: 25, vy: 0, set: true },
      { frame: 18, vx: 2, set: true },
    ],
    hitboxes: [box(0.6, 1.1, 0.8, 8, 18, hit(14, 12, 0.21, 35))],
  },
  holdHeavyDown: {
    name: "Earth Splitter",
    frames: 46,
    sound: "slash",
    heavy: true,
    root: true,
    hitboxes: [box(0.9, 0.3, 0.7, 14, 17, hit(11, 10, 0.17, 70))],
    projectiles: [
      { frame: 16, x: 1.2, y: 0.35, vx: 12, vy: 0, r: 0.45, life: 30, look: "wave", ...hit(8, 8, 0.13, 70) },
      { frame: 16, x: -1.2, y: 0.35, vx: -12, vy: 0, r: 0.45, life: 30, look: "wave", ...hit(8, 8, 0.13, 70) },
    ],
  },
};
