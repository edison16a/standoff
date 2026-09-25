import type { Lane } from "./tuning";

export type ObstacleKind = "low" | "high" | "train" | "ramp";

/**
 * Anything on the tracks the runner can hit or stand on. Positions are
 * along the track in metres. A standing thing sits at `z`. A moving train
 * rolls toward the runner at `drift` times their speed, and its front
 * reaches `z` exactly when the runner does, so where it is depends only
 * on how far the runner has come. Two players on one seed see it alike.
 */
export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  lane: Lane;
  z: number;
  length: number;
  /** 0 standing, else the train's speed as a share of the runner's. */
  drift: number;
  /** Which paint job or board design to draw. */
  style: number;
  /** Cars in a train. */
  cars: number;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
  z: number;
  /** Seconds since a magnet caught it and it took off toward the runner. Absent while it sits still. */
  flying?: number;
}

export type PowerKind = "boots" | "hoverboard" | "magnet" | "double" | "jetpack";

export const POWER_KINDS: readonly PowerKind[] = ["boots", "hoverboard", "magnet", "double", "jetpack"];

export interface Pickup {
  id: number;
  kind: PowerKind;
  lane: Lane;
  y: number;
  z: number;
}

/** Where the front of an obstacle is when the runner has come `distance` metres. */
export function frontAt(obstacle: Obstacle, distance: number): number {
  return obstacle.drift ? obstacle.z + obstacle.drift * (obstacle.z - distance) : obstacle.z;
}
