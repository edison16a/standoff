import { both, box, hit } from "./build";
import type { Moveset } from "./types";

/** Mage: floaty and light, and dangerous from a distance. Most heavies are cast in place. */
export const MAGE: Moveset = {
  jab: { name: "Staff Poke", frames: 16, sound: "punch", hitboxes: [box(0.9, 1.1, 0.45, 3, 5, hit(3, 5, 0.05, 30))] },
  side: { name: "Spark", frames: 26, sound: "magic", hitboxes: [box(1.6, 1.1, 0.7, 7, 11, hit(8, 7, 0.13, 35))] },
  up: { name: "Flare", frames: 28, sound: "magic", hitboxes: [box(0.2, 2.4, 0.85, 7, 12, hit(9, 8, 0.14, 88))] },
  down: { name: "Frost", frames: 24, sound: "magic", hitboxes: both(0.9, 0.25, 0.6, 6, 10, hit(7, 7, 0.1, 30)) },
  air: { name: "Orb Spin", frames: 28, sound: "magic", landLag: 6, hitboxes: [box(0, 1.0, 1.05, 5, 12, hit(7, 6, 0.1, 45))] },
  airUp: { name: "Sparkle", frames: 26, sound: "magic", landLag: 6, hitboxes: [box(0, 2.2, 0.8, 5, 10, hit(8, 7, 0.13, 88))] },
  airDown: { name: "Drop Blast", frames: 32, sound: "magic", heavy: true, landLag: 12, hitboxes: [box(0, -0.2, 0.8, 10, 14, hit(10, 6, 0.14, -70))] },
  heavy: {
    name: "Magic Bolt",
    frames: 32,
    sound: "magic",
    hover: true,
    hitboxes: [],
    projectiles: [{ frame: 10, x: 0.8, y: 1.2, vx: 15, vy: 0, r: 0.38, life: 70, ...hit(9, 6, 0.12, 30) }],
  },
  heavySide: { name: "Arcane Blast", frames: 40, sound: "magic", heavy: true, hover: true, hitboxes: [box(1.8, 1.1, 1.0, 14, 18, hit(15, 10, 0.21, 35))] },
  heavyUp: {
    name: "Blink",
    frames: 40,
    sound: "magic",
    recovery: true,
    invincible: [4, 12],
    motion: [{ frame: 8, vx: 3, vy: 18, set: true }],
    hitboxes: [box(0, 1.0, 0.9, 12, 16, hit(7, 8, 0.1, 80))],
  },
  heavyDown: { name: "Nova", frames: 42, sound: "magic", heavy: true, hover: true, hitboxes: [box(0, 1.0, 2.0, 16, 20, hit(14, 10, 0.19, 50))] },
  ult: {
    name: "Arcane Storm",
    frames: 72,
    sound: "magic",
    heavy: true,
    unblockable: true,
    hover: true,
    invincible: [1, 46],
    armor: [1, 72],
    hitboxes: [box(0, 1.0, 4.5, 40, 46, hit(24, 16, 0.23, 55))],
    projectiles: [
      { frame: 44, x: 1, y: 1.2, vx: 16, vy: 0, r: 0.6, life: 60, ...hit(12, 12, 0.18, 35) },
      { frame: 44, x: -1, y: 1.2, vx: -16, vy: 0, r: 0.6, life: 60, ...hit(12, 12, 0.18, 35) },
    ],
  },
};
