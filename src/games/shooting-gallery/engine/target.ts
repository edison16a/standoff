import type { Seat } from "@/platform/protocol";
import type { TargetKind } from "./kinds";
import type { LaneId, Vec3 } from "./layout";

/** Who knocked a target down, when, and where the BB struck it. */
export interface Hit {
  /** Round time of the hit, in seconds. */
  at: number;
  /** The shooter, or null for a practice shot in the lobby. */
  by: Seat | null;
  point: Vec3;
  points: number;
  bull: boolean;
}

/** One duck, bullseye or plate on its way across the booth. */
export interface Target {
  id: number;
  kind: TargetKind;
  lane: LaneId;
  /** The hinge it stands on. It falls around this point when hit. */
  x: number;
  y: number;
  z: number;
  /** Signed speed along the lane before the round's speed ramp, metres per second. */
  vx: number;
  /** Which way it faces, so ducks swim forward. */
  facing: 1 | -1;
  born: number;
  /** Pop ups only: how far up the stick is, from 0 hidden to 1 fully up. */
  raise: number;
  /** Pop ups only: the round time it starts to sink again. */
  lowerAt: number;
  hit: Hit | null;
}

export function isLive(target: Target): boolean {
  return target.hit === null;
}
