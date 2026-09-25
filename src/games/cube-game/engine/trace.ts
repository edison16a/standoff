import { startState, type PlayerState } from "./player";
import { step } from "./physics";
import { STEP } from "./tuning";
import type { Level } from "./types";
import { World } from "./world";

export interface TracePoint {
  t: number;
  x: number;
  y: number;
  grounded: boolean;
  gravity: 1 | -1;
}

export interface TraceResult {
  points: TracePoint[];
  finished: boolean;
  /** Where the run died, if it did. */
  death: { x: number; t: number } | null;
  final: PlayerState;
}

/**
 * Plays a level with jumps at exact times, in fixed steps, from the start
 * until it finishes, dies or passes `untilX`. Used to prove levels can be
 * finished, and by the level builder to place obstacles around the path a
 * perfect run takes.
 */
export function trace(level: Level, jumpTimes: readonly number[], options: { untilX?: number; every?: number } = {}): TraceResult {
  const world = new World(level);
  const p = startState(level);
  const times = [...jumpTimes].sort((a, b) => a - b);
  const until = options.untilX ?? Infinity;
  const every = options.every ?? 1;
  const points: TracePoint[] = [];
  let next = 0;
  let t = 0;
  for (let i = 0; !p.dead && !p.finished && p.x < until; i++) {
    let pressed = false;
    // A press lands on the first step at or after its time.
    while (next < times.length && times[next]! <= t + 1e-9) {
      pressed = true;
      next++;
    }
    step(p, world, STEP, pressed);
    t += STEP;
    if (i % every === 0) points.push({ t, x: p.x, y: p.y, grounded: p.grounded, gravity: p.gravity });
  }
  return { points, finished: p.finished, death: p.dead ? { x: p.x, t } : null, final: p };
}

/** The lowest and highest the path goes between two places. */
export function span(points: readonly TracePoint[], from: number, to: number): { low: number; high: number } | null {
  let low = Infinity;
  let high = -Infinity;
  for (const point of points) {
    if (point.x < from) continue;
    if (point.x > to) break;
    low = Math.min(low, point.y);
    high = Math.max(high, point.y);
  }
  return low === Infinity ? null : { low, high };
}
