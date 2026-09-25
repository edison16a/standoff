import type { MoveKey } from "../../engine/moves";
import type { PosePatch } from "./pose";
import type { StrikeAnim } from "./strike";

/**
 * How one fighter carries themselves: the guard they stand in, how they
 * run, how they celebrate, and an animation for each of their moves.
 */
export interface Style {
  stance: PosePatch;
  /** Arm poses held while running, over the swing of the stride. */
  runArms: PosePatch;
  /** How much the arms swing with the stride: 1 swings freely, 0 holds the guard. */
  armSwing: number;
  /** Forward lean while running. */
  runLean: number;
  /** Metres per stride, for matching feet to the ground. */
  stride: number;
  guard: PosePatch;
  win: PosePatch;
  moves: Record<MoveKey, StrikeAnim>;
}
