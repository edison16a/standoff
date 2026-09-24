import type { Course } from "./course";
import { MAGNET_AHEAD } from "./powers";
import { bodyHeight, type RunnerState } from "./runner";
import { COIN, laneX } from "./tuning";
import type { Coin, Pickup } from "./types";

/**
 * Coins and power ups the runner reaches this step. They are taken off
 * the course, so each is counted once. With the magnet on, coins from
 * every lane nearby fly in too.
 */
export function collectCoins(course: Course, s: RunnerState, magnet: boolean): { coin: Coin; pulled: boolean }[] {
  const found: { coin: Coin; pulled: boolean }[] = [];
  const feet = s.y;
  const head = s.y + bodyHeight(s);
  const coins = course.coins;
  let keep = 0;
  for (const coin of coins) {
    const dz = coin.z - s.distance;
    const touching = Math.abs(dz) < COIN.reachZ && Math.abs(coin.x - s.x) < COIN.reachX && coin.y > feet - 0.3 && coin.y < head + 0.6;
    const pulled = !touching && magnet && dz > -2 && dz < MAGNET_AHEAD && Math.abs(coin.y - (feet + 1)) < 5;
    if (touching || pulled) found.push({ coin, pulled });
    else coins[keep++] = coin;
  }
  coins.length = keep;
  return found;
}

export function collectPickup(course: Course, s: RunnerState): Pickup | null {
  const head = s.y + bodyHeight(s);
  const index = course.pickups.findIndex(
    (p) => Math.abs(p.z - s.distance) < 1.1 && Math.abs(laneX(p.lane) - s.x) < 1.1 && p.y > s.y - 0.5 && p.y < head + 0.8,
  );
  if (index < 0) return null;
  const [pickup] = course.pickups.splice(index, 1);
  return pickup ?? null;
}
