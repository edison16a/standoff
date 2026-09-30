import type { ShowcaseView } from "@/platform/games/game-api";
import type { Plan } from "./plan";
import { SEED } from "./script";

/**
 * The capture tool lets the showcase run this long before it records,
 * so the first shot starts here and the clip opens on it.
 */
const WARMUP = 3;

/**
 * The loop is a trailer cut from one fight on the Dojo Rooftop (seed 9):
 * close, low cameras on the big moments, the hardest hits in slow motion,
 * and the samurai's win to close. It runs exactly the eight seconds the
 * tool records, so the second it fades over the start is the start
 * again and the loop has no seam. Fighters: 0 karate, 1 samurai, 2 mage,
 * 3 bear. Only the loop and the poster are filmed. The icon is staged
 * instead, in cover.ts.
 */
export const PLANS: Record<Exclude<ShowcaseView, "icon">, Plan> = {
  loop: {
    lead: WARMUP,
    shots: [
      // Half speed, low on the bear: the ult's slam sends the samurai and the karate flying.
      { seed: SEED, from: 26.0, length: 1.4, rate: 0.5, rig: { kind: "follow", id: 3, distance: 8, dy: -1, yaw: -0.3, lift: -1 } },
      // The karate goes out through the top in a beam of colour.
      { seed: SEED, from: 27.0, length: 0.8, rig: { kind: "wide" } },
      // The mage lets the ult go and launches two at once.
      { seed: SEED, from: 17.4, length: 1.2, rig: { kind: "follow", id: 2, distance: 8, dy: -1, yaw: 0.3, lift: -0.8 } },
      // The samurai's string lands on the mage and the karate.
      { seed: SEED, from: 30.4, length: 1, rig: { kind: "follow", id: 1, distance: 10, dy: -1, yaw: 0.35, lift: -0.8 } },
      // Half speed: the samurai's last cut sends the bear flying for the match.
      { seed: SEED, from: 45.6, length: 1.2, rate: 0.5, rig: { kind: "follow", id: 1, distance: 7, dy: -1, yaw: -0.35, lift: -0.8 } },
      // The final KO beam, and the confetti starts.
      { seed: SEED, from: 46.2, length: 1, rig: { kind: "follow", id: 1, distance: 10, dy: 0, yaw: -0.4, lift: -0.5 } },
      // The champion, close and low, in the confetti.
      { seed: SEED, from: 47.4, length: 1.4, rig: { kind: "follow", id: 1, distance: 6, dy: -1.2, yaw: -0.55, lift: -0.8, fov: 30 } },
    ],
  },
  // The bear's ult: shockwave rings, the samurai and the karate launched off the rooftop.
  poster: { shots: [{ seed: SEED, from: 26.45, length: 3, rig: { kind: "follow", id: 3, distance: 10, dy: -0.8, yaw: -0.3, lift: -1 } }], freeze: 0.2 },
};
