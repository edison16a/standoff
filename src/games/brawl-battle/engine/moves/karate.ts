import { both, box, flurry, hit } from "./build";
import type { Moveset } from "./types";

/** Karate: quick and light. Small hits that chain, and a fast flying kick. */
export const KARATE: Moveset = {
  jab: { name: "Jab", frames: 14, sound: "punch", hitboxes: [box(0.75, 1.25, 0.45, 3, 5, hit(3, 4, 0.04, 20))] },
  side: { name: "Roundhouse", frames: 24, sound: "kick", hitboxes: [box(1.0, 1.05, 0.55, 6, 9, hit(8, 7, 0.13, 35))] },
  up: { name: "High Kick", frames: 22, sound: "kick", hitboxes: [box(0.35, 2.0, 0.6, 5, 9, hit(7, 7, 0.12, 85))] },
  down: { name: "Low Sweep", frames: 20, sound: "kick", hitboxes: [box(0.95, 0.3, 0.5, 5, 8, hit(6, 6, 0.1, 25))] },
  air: { name: "Flying Knee", frames: 26, sound: "kick", landLag: 6, hitboxes: [box(0.6, 1.0, 0.6, 4, 12, hit(8, 6, 0.11, 40))] },
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
    frames: 34,
    sound: "punch",
    heavy: true,
    motion: [{ frame: 11, vx: 3 }],
    hitboxes: [box(1.0, 1.2, 0.6, 12, 15, hit(14, 9, 0.21, 38))],
  },
  heavySide: {
    name: "Flying Kick",
    frames: 36,
    sound: "kick",
    heavy: true,
    landLag: 10,
    motion: [{ frame: 8, vx: 14, vy: 3, set: true }],
    hitboxes: [box(0.8, 1.0, 0.6, 8, 20, hit(11, 8, 0.17, 35))],
  },
  heavyUp: {
    name: "Rising Dragon",
    frames: 40,
    sound: "kick",
    recovery: true,
    motion: [{ frame: 5, vx: 2, vy: 17, set: true }],
    hitboxes: [box(0.4, 1.4, 0.7, 5, 9, hit(5, 6, 0.03, 80), 0), box(0.4, 1.6, 0.75, 10, 16, hit(8, 9, 0.15, 80), 1)],
  },
  heavyDown: { name: "Spin Sweep", frames: 34, sound: "kick", heavy: true, hitboxes: both(1.0, 0.4, 0.6, 9, 13, hit(12, 9, 0.19, 30)) },
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
      box(1.1, 1.2, 1.4, 40, 44, hit(16, 16, 0.22, 40), 5),
    ],
  },
};
