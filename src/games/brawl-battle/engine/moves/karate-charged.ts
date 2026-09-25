import { both, box, hit } from "./build";
import type { ChargedSet } from "./types";

/**
 * Karate's charged moves: a spinning tornado kick, a rising dragon
 * uppercut, a split kick both ways, a long flying kick across the stage
 * and a leaping heel drop that cracks the floor.
 */
export const KARATE_CHARGED: ChargedSet = {
  holdSide: {
    name: "Tornado Kick",
    frames: 34,
    sound: "kick",
    heavy: true,
    root: true,
    motion: [{ frame: 4, vx: 7, set: true }],
    hitboxes: [box(1.0, 1.1, 0.7, 6, 8, hit(4, 4, 0.02, 40), 0), box(1.1, 1.1, 0.75, 12, 15, hit(13, 11, 0.22, 38), 1)],
  },
  holdUp: {
    name: "Dragon Uppercut",
    frames: 40,
    sound: "punch",
    heavy: true,
    root: true,
    landLag: 12,
    motion: [{ frame: 6, vx: 2, vy: 10, set: true }],
    hitboxes: [box(0.5, 1.6, 0.75, 6, 9, hit(5, 6, 0.03, 85), 0), box(0.4, 2.1, 0.8, 10, 15, hit(12, 11, 0.22, 85), 1)],
  },
  holdDown: { name: "Split Kick", frames: 32, sound: "kick", heavy: true, root: true, hitboxes: both(1.2, 0.4, 0.7, 7, 11, hit(13, 11, 0.21, 28)) },
  holdHeavy: {
    name: "Dragon Flight",
    frames: 44,
    sound: "kick",
    heavy: true,
    root: true,
    stopOnHit: true,
    landLag: 12,
    motion: [
      { frame: 8, vx: 21, vy: 2, set: true },
      { frame: 22, vx: 3, set: true },
    ],
    hitboxes: [box(0.9, 1.0, 0.75, 8, 22, hit(15, 12, 0.23, 35))],
  },
  holdHeavyDown: {
    name: "Heel Drop",
    frames: 42,
    sound: "kick",
    heavy: true,
    root: true,
    motion: [
      { frame: 6, vx: 0, vy: 8, set: true },
      { frame: 16, vy: -18, set: true },
    ],
    hitboxes: [box(0.5, 0.3, 0.7, 16, 22, hit(12, 7, 0.16, -75), 0), ...both(1.4, 0.2, 0.7, 22, 26, hit(10, 10, 0.16, 60), 1)],
  },
};
