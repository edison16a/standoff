import type { Course } from "./course";
import { MAGNET_AHEAD } from "./powers";
import { bodyHeight, type RunnerState } from "./runner";
import { COIN, laneX, RUNNER } from "./tuning";
import type { Coin, Pickup } from "./types";

/** A caught coin flies at this many metres a second, faster the longer it flies. */
const PULL = { speed: 10, gain: 50 };
/** Where a flying coin aims: the runner's chest. */
const CHEST = 0.9;
/** A flying coin is taken once it is this near the chest, which is on the body. */
const CATCH = 0.45;
/** Along the track, a power up is taken as its floating model meets the body. */
const PICKUP_REACH = RUNNER.halfDepth + 0.4;

/** Whether a still coin touches the runner's body now: its edge meets the body, not a moment sooner. */
export function touchesCoin(coin: Coin, s: RunnerState): boolean {
  const dz = coin.z - s.distance;
  if (dz > COIN.reachZ || dz < -COIN.reachZ) return false;
  if (Math.abs(coin.x - s.x) >= COIN.reachX) return false;
  return coin.y > s.y - COIN.radius && coin.y < s.y + bodyHeight(s) + COIN.radius;
}

/**
 * Coins the runner reaches this step. They are taken off the course, so
 * each is counted once. With the magnet on, coins from every lane ahead
 * are caught and fly to the runner, moving with them so they are never
 * overtaken, and are taken only when they arrive.
 */
export function collectCoins(course: Course, s: RunnerState, magnet: boolean, dt: number): { coin: Coin; pulled: boolean }[] {
  const found: { coin: Coin; pulled: boolean }[] = [];
  const coins = course.coins;
  let keep = 0;
  for (const coin of coins) {
    if (coin.flying === undefined && magnet && caught(coin, s)) coin.flying = 0;
    const taken = coin.flying === undefined ? touchesCoin(coin, s) : fly(coin, s, dt);
    if (taken) found.push({ coin, pulled: coin.flying !== undefined });
    else coins[keep++] = coin;
  }
  coins.length = keep;
  return found;
}

function caught(coin: Coin, s: RunnerState): boolean {
  const dz = coin.z - s.distance;
  return dz > -1 && dz < MAGNET_AHEAD && Math.abs(coin.y - (s.y + 1)) < 5;
}

/** Moves a flying coin toward the chest, in the runner's own frame. Returns true once it arrives. */
function fly(coin: Coin, s: RunnerState, dt: number): boolean {
  coin.flying = (coin.flying ?? 0) + dt;
  const rx = coin.x - s.x;
  const ry = coin.y - (s.y + CHEST);
  const rz = coin.z - s.distance;
  const gap = Math.hypot(rx, ry, rz);
  const step = (PULL.speed + PULL.gain * coin.flying) * dt;
  const keep = gap > step ? 1 - step / gap : 0;
  coin.x = s.x + rx * keep;
  coin.y = s.y + CHEST + ry * keep;
  coin.z = s.distance + rz * keep;
  return gap * keep < CATCH;
}

export function collectPickup(course: Course, s: RunnerState): Pickup | null {
  const head = s.y + bodyHeight(s);
  const index = course.pickups.findIndex(
    (p) => Math.abs(p.z - s.distance) < PICKUP_REACH && Math.abs(laneX(p.lane) - s.x) < 1.1 && p.y > s.y - 0.5 && p.y < head + 0.8,
  );
  if (index < 0) return null;
  const [pickup] = course.pickups.splice(index, 1);
  return pickup ?? null;
}
