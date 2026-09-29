import { bodyHeight, type RunnerState } from "./body";
import { blocksBody, overlapsX, overlapsZ, solidAt, topAt, type Solid } from "./solids";
import { clampLane, laneX, RUNNER, type Lane } from "./tuning";
import { frontAt, type Obstacle } from "./types";

/** A head on hit ends the run. A knock from the side is a stumble. */
export type Contact = { type: "front"; obstacle: Obstacle } | { type: "side"; obstacle: Obstacle; side: -1 | 1 };

/**
 * Clipping a corner: a head on hit with only part of the body in front
 * of the thing, mid lane change. The real game calls that a stumble and
 * bounces the runner off, not a crash.
 */
const GRAZE = RUNNER.halfWidth + 0.1;

const scratch: Solid = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };

/** The highest thing under the runner's feet that they could stand on, or the ground. */
export function groundUnder(x: number, feet: number, z: number, near: readonly Obstacle[]): number {
  let ground = 0;
  for (const o of near) {
    const solid = solidAt(o, z, scratch);
    if (!overlapsX(solid, x, RUNNER.halfWidth) || !overlapsZ(solid, z, RUNNER.halfDepth)) continue;
    const top = topAt(o, solid, z);
    if (top <= feet + RUNNER.stepUp && top > ground) ground = top;
  }
  return ground;
}

/** The first obstacle in a lane beside the runner that their body would walk into. */
export function sideBlocker(s: RunnerState, lane: Lane, near: readonly Obstacle[]): Obstacle | null {
  const x = laneX(lane);
  const head = s.y + bodyHeight(s);
  for (const o of near) {
    if (o.lane !== lane) continue;
    const solid = solidAt(o, s.distance, scratch);
    if (!overlapsX(solid, x, RUNNER.halfWidth) || !overlapsZ(solid, s.distance, RUNNER.halfDepth)) continue;
    if (blocksBody(o, solid, s.distance, s.y, head, RUNNER.stepUp)) return o;
  }
  return null;
}

/**
 * Whether the runner's body now overlaps something solid, and whether
 * they hit it head on or from the side. A knock from the side, or a
 * clipped corner, bounces them back out of its lane.
 */
export function collide(s: RunnerState, near: readonly Obstacle[], before: number, feetBefore: number): Contact | null {
  const head = s.y + bodyHeight(s);
  for (const o of near) {
    const solid = solidAt(o, s.distance, scratch);
    if (!overlapsX(solid, s.x, RUNNER.halfWidth) || !overlapsZ(solid, s.distance, RUNNER.halfDepth)) continue;
    if (!blocksBody(o, solid, s.distance, s.y, head, RUNNER.stepUp)) continue;
    // Coming down onto its top is standing on it, not hitting it.
    if (feetBefore >= topAt(o, solid, s.distance) - RUNNER.stepUp) continue;
    const wasAhead = before + RUNNER.halfDepth <= frontAt(o, before) + 0.05;
    if (wasAhead && !grazed(s, solid)) return { type: "front", obstacle: o };
    return bounce(s, o, solid);
  }
  return null;
}

function grazed(s: RunnerState, solid: Solid): boolean {
  return s.x < solid.minX + GRAZE || s.x > solid.maxX - GRAZE;
}

/** Steps the runner back out of an obstacle's lane, to just clear of its side. */
function bounce(s: RunnerState, o: Obstacle, solid: Solid): Contact {
  const side = (Math.sign(laneX(o.lane) - s.x) || 1) as -1 | 1;
  s.lane = clampLane(o.lane - side);
  s.x = laneX(o.lane) - side * (solid.maxX - solid.minX) * 0.5 - side * (RUNNER.halfWidth + 0.02);
  s.blockedBy = o.id;
  return { type: "side", obstacle: o, side };
}
