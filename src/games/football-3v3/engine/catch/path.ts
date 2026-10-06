import { cloneFlight, stepFlight, type Flight } from "../flight";
import type { V2, V3 } from "../vec";
import { HANDS } from "./reach";

/**
 * The ball's path ahead, traced once with the same physics when it is
 * thrown or knocked, so players can read where it will come down: the
 * receiver runs to meet it and defenders break on it, the way real
 * players track a ball in the air.
 */
export interface BallPath {
  /** Match time of the first point. */
  at: number;
  /** Where the ball is every PATH_DT seconds, up to the turf. */
  points: V3[];
}

export const PATH_DT = 1 / 30;
const LIMIT = 5;

export function tracePath(f: Flight, at: number): BallPath {
  const g = cloneFlight(f);
  const points: V3[] = [{ ...g.pos }];
  for (let t = 0; t < LIMIT && !g.grounded; t += PATH_DT) {
    stepFlight(g, PATH_DT);
    points.push({ ...g.pos });
  }
  return { at, points };
}

/** Where the ball will be at match time `time`, on the traced path. */
export function pathAt(path: BallPath, time: number): V3 {
  const u = Math.max(0, (time - path.at) / PATH_DT);
  const i = Math.min(path.points.length - 1, Math.floor(u));
  const a = path.points[i]!;
  const b = path.points[Math.min(path.points.length - 1, i + 1)]!;
  const k = Math.min(1, u - i);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
}

export interface Meet {
  /** Where to be, on the ground, and the height the ball passes there. */
  spot: V2;
  y: number;
  /** Seconds from now until the ball is there. */
  wait: number;
}

/** Chest high: where a receiver wants the ball, not over his head or at his shoes. */
const COMFY = { low: 0.7, high: 1.9, best: 1.25 } as const;

/**
 * Where to run to meet the ball: the point on the path nearest chest
 * height that a player running at `speed` with `reach` of arm gets to in
 * time, as a receiver settles under it. Failing that, the first point he
 * can get a hand to at any height, and failing that the last catchable
 * point, so he at least goes after it.
 */
export function meetPoint(path: BallPath, now: number, from: V2, speed: number, reach: number): Meet | null {
  let comfy: Meet | null = null;
  let any: Meet | null = null;
  let last: Meet | null = null;
  for (let i = 0; i < path.points.length; i++) {
    const wait = path.at + i * PATH_DT - now;
    if (wait < 0) continue;
    const p = path.points[i]!;
    if (p.y > HANDS.high + 0.2 || p.y < 0.25) continue;
    const meet = { spot: { x: p.x, z: p.z }, y: p.y, wait };
    last = meet;
    const run = Math.hypot(p.x - from.x, p.z - from.z) - reach;
    if (run > speed * Math.max(0, wait - 0.12)) continue;
    any ??= meet;
    const fits = p.y >= COMFY.low && p.y <= COMFY.high;
    if (fits && (!comfy || Math.abs(p.y - COMFY.best) < Math.abs(comfy.y - COMFY.best))) comfy = meet;
  }
  return comfy ?? any ?? last;
}
