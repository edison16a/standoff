import { both, box, flurry, hit } from "./build";
import type { Moveset } from "./types";

/** Samurai: the longest reach. Katana cuts that are a little slower to come out. */
export const SAMURAI: Moveset = {
  jab: { name: "Quick Cut", frames: 18, sound: "slash", hitboxes: [box(1.1, 1.2, 0.55, 3, 6, hit(4, 5, 0.05, 25))] },
  side: {
    name: "Wide Slash",
    frames: 25,
    sound: "slash",
    hitboxes: [box(1.0, 1.1, 0.6, 6, 10, hit(11, 7, 0.16, 35)), box(2.0, 1.0, 0.55, 6, 10, hit(11, 7, 0.16, 35))],
  },
  up: {
    name: "Arc Slash",
    frames: 28,
    sound: "slash",
    hitboxes: [box(1.0, 1.6, 0.6, 6, 11, hit(9, 8, 0.14, 85)), box(0, 2.3, 0.6, 6, 11, hit(9, 8, 0.14, 85)), box(-0.9, 1.6, 0.55, 6, 11, hit(9, 8, 0.14, 85))],
  },
  down: { name: "Low Cut", frames: 22, sound: "slash", hitboxes: [box(1.4, 0.3, 0.55, 5, 8, hit(7, 6, 0.11, 20))] },
  air: { name: "Spin Slash", frames: 30, sound: "slash", landLag: 8, hitboxes: both(1.2, 1.0, 0.6, 6, 12, hit(9, 7, 0.12, 40)) },
  airUp: { name: "Rising Arc", frames: 27, sound: "slash", landLag: 8, hitboxes: [box(0.5, 2.2, 0.6, 5, 10, hit(9, 7, 0.12, 85))] },
  airDown: { name: "Down Thrust", frames: 30, sound: "slash", heavy: true, landLag: 14, hitboxes: [box(0.2, -0.3, 0.5, 9, 14, hit(11, 6, 0.14, -80))] },
  heavy: {
    name: "Iai Draw",
    frames: 36,
    sound: "slash",
    heavy: true,
    hitboxes: [box(1.4, 1.1, 0.6, 13, 16, hit(16, 10, 0.22, 35)), box(2.5, 1.1, 0.6, 13, 16, hit(16, 10, 0.22, 35))],
  },
  heavySide: {
    name: "Dash Cut",
    frames: 38,
    sound: "slash",
    heavy: true,
    landLag: 12,
    motion: [
      { frame: 10, vx: 16, vy: 0, set: true },
      { frame: 20, vx: 2, set: true },
    ],
    hitboxes: [box(1.0, 1.1, 0.75, 10, 18, hit(12, 8, 0.18, 30))],
  },
  heavyUp: {
    name: "Rising Slash",
    frames: 42,
    sound: "slash",
    recovery: true,
    motion: [{ frame: 6, vx: 3, vy: 16.5, set: true }],
    hitboxes: [box(0.8, 1.6, 0.8, 6, 14, hit(10, 8, 0.14, 75))],
  },
  heavyDown: { name: "Ground Slash", frames: 34, sound: "slash", heavy: true, hitboxes: both(1.7, 0.3, 0.6, 9, 13, hit(13, 9, 0.21, 25)) },
  ult: {
    name: "Thousand Cuts",
    frames: 80,
    sound: "slash",
    heavy: true,
    unblockable: true,
    hover: true,
    invincible: [1, 56],
    armor: [1, 80],
    hitboxes: [
      ...flurry(5, 20, 5, 3, [[1.5, 1.2, 1.1], [3, 1.2, 1.1], [4.5, 1.2, 1.1]], hit(3, 1, 0, 90)),
      box(1.5, 1.2, 1.3, 52, 56, hit(16, 16, 0.22, 40), 5),
      box(3, 1.2, 1.3, 52, 56, hit(16, 16, 0.22, 40), 5),
      box(4.5, 1.2, 1.3, 52, 56, hit(16, 16, 0.22, 40), 5),
    ],
  },
};
