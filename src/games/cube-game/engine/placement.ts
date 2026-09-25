import { CEILING, type LevelBuilder } from "./builder";
import { span } from "./trace";
import { HALF } from "./tuning";

/**
 * Obstacles placed around the path a perfect run really takes. The
 * builder plays the jumps written so far, then these fill in hazards
 * that the perfect run just clears, so every level stays finishable.
 */

/** Puts an orb on the perfect run's path at this beat, and a jump to use it. */
export function orbOnPath(b: LevelBuilder, beat: number): void {
  const x = b.x(beat);
  const point = b.path(x + 1).find((p) => p.x >= x);
  if (!point) throw new Error(`no path at beat ${beat} for an orb`);
  b.orb(x, point.y);
  b.jump(beat);
}

/**
 * UFO gates: a pillar from the floor and one from the ceiling on each
 * beat, leaving `gap` blocks above and below where the perfect run flies.
 */
export function ufoGates(b: LevelBuilder, beats: readonly number[], gap = 1.2, ceiling = CEILING.ufo!): void {
  const points = b.path(b.x(Math.max(...beats)) + 3);
  for (const beat of beats) {
    const x = b.x(beat);
    const around = span(points, x - 1.6, x + 1.6);
    if (!around) continue;
    const bottom = around.low - HALF - gap;
    const top = around.high + HALF + gap;
    if (bottom > 0.4) b.block(x - 0.5, 0, 1, bottom);
    if (ceiling - top > 0.4) b.block(x - 0.5, top, 1, ceiling - top);
  }
}

/**
 * Ball spikes: every `every` beats from `from` to `to`, a spike on the
 * floor or the ceiling wherever the perfect run is well away from it.
 */
export function ballSpikes(b: LevelBuilder, from: number, to: number, every = 1, ceiling = CEILING.ball!): void {
  const points = b.path(b.x(to) + 3);
  for (let beat = from; beat <= to + 1e-6; beat += every) {
    const x = b.x(beat);
    const around = span(points, x - 1.3, x + 1.3);
    if (!around) continue;
    if (around.low - HALF > 1.3) b.spikes(x, 1, 0, 1);
    if (ceiling - around.high - HALF > 1.3) b.spikes(x, 1, ceiling, -1);
  }
}

/** A row of floor spikes between two places, wherever the perfect run flies clear above them. */
export function spikesUnderPath(b: LevelBuilder, fromX: number, toX: number, y = 0, clearance = 1.1): void {
  const points = b.path(toX + 3);
  for (let x = Math.ceil(fromX); x + 1 <= toX; x += 1) {
    const around = span(points, x - 0.8, x + 1.8);
    if (around && around.low - HALF - y > clearance) b.spikes(x + 0.5, 1, y);
  }
}
