import { both, box, flurry, hit } from "./build";
import type { Moveset } from "./types";

/** Karate: quick and light. Small hits that chain, and a fast flying kick. */
export const KARATE: Moveset = {
  jab: { name: "Jab", frames: 12, sound: "punch", hitboxes: [box(0.8, 1.25, 0.5, 3, 5, hit(4, 4, 0.04, 20))] },
  side: { name: "Roundhouse", frames: 21, sound: "kick", hitboxes: [box(1.1, 1.05, 0.6, 6, 11, hit(10, 7, 0.15, 35))] },
  up: { name: "High Kick", frames: 20, sound: "kick", hitboxes: [box(0.35, 2.0, 0.65, 4, 9, hit(8, 7, 0.14, 85))] },
  down: { name: "Low Sweep", frames: 18, sound: "kick", hitboxes: [box(1.0, 0.3, 0.55, 4, 8, hit(7, 6, 0.12, 25))] },
  air: { name: "Flying Knee", frames: 24, sound: "kick", landLag: 6, hitboxes: [box(0.65, 1.0, 0.6, 5, 12, hit(8, 6, 0.12, 40))] },
  airUp: {
    name: "Bicycle Kick",
    frames: 24,
    sound: "kick",
    landLag: 6,
    hitboxes: [box(0.3, 1.9, 0.6, 4, 7, hit(4, 3, 0.02, 90), 0), box(0.3, 2.0, 0.65, 10, 13, hit(6, 7, 0.12, 88), 1)],
  },
  airDown: { name: "Stomp", frames: 30, sound: "kick", heavy: true, landLag: 12, hitboxes: [box(0.2, -0.1, 0.55, 8, 12, hit(10, 5, 0.14, -75))] },
  heavy: {
    name: "Power Punch",
    frames: 30,
    sound: "punch",
    heavy: true,
    motion: [{ frame: 9, vx: 3 }],
    hitboxes: [box(1.05, 1.2, 0.65, 11, 16, hit(15, 10, 0.23, 38))],
  },
  heavySide: {
    name: "Flying Kick",
    frames: 32,
    sound: "kick",
    heavy: true,
    landLag: 8,
    motion: [{ frame: 7, vx: 15, vy: 3, set: true }],
    hitboxes: [box(0.85, 1.0, 0.65, 7, 20, hit(13, 9, 0.21, 35))],
  },
  heavyUp: {
    name: "Rising Dragon",
    frames: 40,
    sound: "kick",
    recovery: true,
    motion: [{ frame: 5, vx: 2, vy: 17, set: true }],
    hitboxes: [box(0.4, 1.4, 0.7, 5, 9, hit(5, 6, 0.03, 80), 0), box(0.4, 1.6, 0.75, 10, 16, hit(8, 9, 0.15, 80), 1)],
  },
  heavyDown: { name: "Spin Sweep", frames: 30, sound: "kick", heavy: true, hitboxes: both(1.05, 0.4, 0.65, 9, 14, hit(12, 9, 0.2, 30)) },
  ult: {
    name: "Dragon Rush",
    frames: 70,
    sound: "kick",
    heavy: true,
    unblockable: true,
    hover: true,
    stopOnHit: true,
    invincible: [1, 24],
    armor: [1, 70],
    motion: [
      { frame: 12, vx: 15, vy: 0, set: true },
      { frame: 24, vx: 0, vy: 0, set: true },
    ],
    hitboxes: [
      ...flurry(5, 13, 5, 4, [[1.0, 1.1, 1.3]], hit(4, 2, 0, 0)),
      box(1.1, 1.2, 1.4, 40, 44, hit(18, 17, 0.24, 40), 5),
    ],
  },
};
