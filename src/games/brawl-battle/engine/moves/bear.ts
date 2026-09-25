import { both, box, hit } from "./build";
import type { Moveset } from "./types";

/** Bear: slow and heavy. Big slams with armor, so small hits cannot stop them. */
export const BEAR: Moveset = {
  jab: { name: "Paw Swipe", frames: 20, sound: "punch", hitboxes: [box(1.0, 1.3, 0.6, 4, 7, hit(5, 6, 0.06, 30))] },
  side: { name: "Claw Swing", frames: 34, sound: "slam", hitboxes: [box(1.3, 1.2, 0.75, 10, 13, hit(11, 9, 0.16, 35))] },
  up: { name: "Headbutt", frames: 30, sound: "slam", hitboxes: [box(0.3, 2.3, 0.75, 8, 12, hit(10, 9, 0.14, 85))] },
  down: { name: "Belly Flop", frames: 34, sound: "slam", hitboxes: both(0.9, 0.35, 0.7, 10, 14, hit(11, 9, 0.14, 30)) },
  air: { name: "Spin Claws", frames: 32, sound: "slam", landLag: 10, hitboxes: both(1.0, 1.1, 0.75, 6, 13, hit(11, 8, 0.14, 40)) },
  airUp: { name: "Up Paw", frames: 30, sound: "slam", landLag: 9, hitboxes: [box(0.3, 2.4, 0.8, 7, 12, hit(11, 8, 0.14, 85))] },
  airDown: {
    name: "Body Drop",
    frames: 40,
    sound: "slam",
    heavy: true,
    landLag: 16,
    motion: [{ frame: 8, vx: 0, vy: -20, set: true }],
    hitboxes: [box(0, 0.2, 0.9, 8, 24, hit(14, 8, 0.17, -80))],
  },
  heavy: { name: "Big Paw", frames: 44, sound: "slam", heavy: true, armor: [8, 20], hitboxes: [box(1.5, 1.3, 0.9, 18, 22, hit(16, 12, 0.23, 38))] },
  heavySide: {
    name: "Charge",
    frames: 46,
    sound: "slam",
    heavy: true,
    landLag: 14,
    armor: [10, 22],
    motion: [
      { frame: 12, vx: 13, vy: 0, set: true },
      { frame: 30, vx: 0, set: true },
    ],
    hitboxes: [box(1.0, 1.1, 0.9, 12, 28, hit(11, 8, 0.17, 35))],
  },
  heavyUp: {
    name: "Leap Slam",
    frames: 46,
    sound: "slam",
    recovery: true,
    motion: [{ frame: 8, vx: 3, vy: 17, set: true }],
    hitboxes: [box(0.5, 2.2, 0.9, 8, 14, hit(10, 8, 0.12, 80))],
  },
  heavyDown: {
    name: "Ground Pound",
    frames: 48,
    sound: "slam",
    heavy: true,
    armor: [8, 24],
    hitboxes: [...both(1.5, 0.3, 0.9, 20, 24, hit(15, 10, 0.19, 45)), box(0, 0.5, 1.0, 20, 24, hit(15, 10, 0.19, 60))],
  },
  ult: {
    name: "Earthquake",
    frames: 80,
    sound: "slam",
    heavy: true,
    unblockable: true,
    invincible: [1, 44],
    armor: [1, 80],
    motion: [
      { frame: 10, vx: 0, vy: 11, set: true },
      { frame: 26, vx: 0, vy: -18, set: true },
    ],
    hitboxes: [...both(3.2, 0.5, 1.5, 36, 44, hit(22, 15, 0.22, 60)), ...both(1.6, 0.5, 1.5, 36, 44, hit(22, 15, 0.22, 60)), box(0, 0.8, 1.5, 36, 44, hit(22, 15, 0.22, 75))],
  },
};
