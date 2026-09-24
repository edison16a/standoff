import { BARRIER, laneX, RAMP_LENGTH, TRAIN } from "./tuning";
import { frontAt, type Obstacle } from "./types";

/** A box in the world, plus the height of its walkable top at a given point along it. */
export interface Solid {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/** Barriers fill their lane, a little narrower than the gap between tracks. */
const BARRIER_HALF = 1.05;

/** Where an obstacle is, as a box, when the runner has come `distance` metres. */
export function solidAt(o: Obstacle, distance: number, out: Solid): Solid {
  const front = frontAt(o, distance);
  const x = laneX(o.lane);
  out.minZ = front;
  out.maxZ = front + o.length;
  switch (o.kind) {
    case "train":
      out.minX = x - TRAIN.width / 2;
      out.maxX = x + TRAIN.width / 2;
      out.minY = 0;
      out.maxY = TRAIN.height;
      break;
    case "ramp":
      out.minX = x - BARRIER_HALF;
      out.maxX = x + BARRIER_HALF;
      out.minY = 0;
      out.maxY = TRAIN.height;
      break;
    case "low":
      out.minX = x - BARRIER_HALF;
      out.maxX = x + BARRIER_HALF;
      out.minY = 0;
      out.maxY = BARRIER.lowTop;
      break;
    case "high":
      out.minX = x - BARRIER_HALF;
      out.maxX = x + BARRIER_HALF;
      out.minY = BARRIER.highBottom;
      out.maxY = BARRIER.highTop;
      break;
  }
  return out;
}

/**
 * The height of an obstacle's top at `z`, for standing on. A ramp slopes
 * from the ground up to a train roof. Everything else is flat on top.
 */
export function topAt(o: Obstacle, solid: Solid, z: number): number {
  if (o.kind !== "ramp") return solid.maxY;
  const t = (z - solid.minZ) / RAMP_LENGTH;
  return Math.max(0, Math.min(1, t)) * TRAIN.height;
}

/**
 * The part of an obstacle that blocks a body standing at `feet`, from
 * the height it can step onto up to the top. A ramp only blocks where its
 * slope is already higher than a step.
 */
export function blocksBody(o: Obstacle, solid: Solid, z: number, feet: number, head: number, stepUp: number): boolean {
  const top = topAt(o, solid, z);
  if (feet >= top - stepUp) return false;
  const bottom = o.kind === "ramp" ? 0 : solid.minY;
  return head > bottom && feet < top;
}

export function overlapsX(solid: Solid, x: number, half: number): boolean {
  return x + half > solid.minX && x - half < solid.maxX;
}

export function overlapsZ(solid: Solid, z: number, half: number): boolean {
  return z + half > solid.minZ && z - half < solid.maxZ;
}
