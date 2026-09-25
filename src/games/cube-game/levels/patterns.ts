import type { LevelBuilder } from "../engine/builder";
import { orbOnPath, spikesUnderPath } from "../engine/placement";

/**
 * Small phrases levels are written with. Each takes the beat the player
 * jumps on, and puts the obstacle where that jump clears it.
 */

/** Jump on the beat over `count` spikes standing on a surface at height y. */
export function hop(b: LevelBuilder, beat: number, count = 1, y = 0): void {
  b.jump(beat).spikes(b.apex(beat), count, y);
}

/** Several hops, one per beat listed. */
export function hops(b: LevelBuilder, beats: readonly number[], count = 1, y = 0): void {
  for (const beat of beats) hop(b, beat, count, y);
}

/**
 * Jump on the beat up onto a platform `top` blocks high that runs until
 * `untilBeat`, then drops back to the floor. A pillar from the floor, so
 * it reads as solid in 3D.
 */
export function platform(b: LevelBuilder, beat: number, top: number, untilBeat: number): void {
  const from = b.apex(beat) - 0.2;
  b.jump(beat).block(from, 0, b.x(untilBeat) - from, top);
}

/** A gap in the floor two blocks wide, cleared by jumping on the beat. */
export function gap(b: LevelBuilder, beat: number, width = 2): void {
  const middle = b.apex(beat);
  b.jump(beat).pit(middle - width / 2, middle + width / 2);
}

/** A pad on the beat that throws the cube over a row of spikes, no jump needed. */
export function padOver(b: LevelBuilder, beat: number, y = 0): void {
  const x = b.x(beat);
  b.pad(x, y);
  spikesUnderPath(b, x + 1, x + 7, y);
}

/** A pad throws the cube up, and a jump through the orb near its peak carries it over a long row of spikes. */
export function padOrb(b: LevelBuilder, beat: number, orbBeat: number, y = 0): void {
  const x = b.x(beat);
  b.pad(x, y);
  orbOnPath(b, orbBeat);
  spikesUnderPath(b, x + 1, b.x(orbBeat) + 7, y);
}
