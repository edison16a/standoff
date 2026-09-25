import { DEG } from "@/games/kit/motion/math3d";
import type { Tuning } from "@/games/fencing/tuning";

/**
 * The point the blade has to pass to parry: this far up and this far right
 * of the calibrated guard, in radians. Calibration sets the guard, so up
 * and right are always the player's own, however they hold the phone.
 */
export interface ParryPoint {
  rise: number;
  right: number;
}

/**
 * After a parry the blade has to drop back under this share of the point
 * before another parry can fire. Without the gap, a hand hovering right at
 * the point would parry over and over.
 */
export const PARRY_REARM_SHARE = 0.6;

export function parryPointFrom(tuning: Pick<Tuning, "parryRise" | "parryRight">): ParryPoint {
  return { rise: tuning.parryRise * DEG, right: tuning.parryRight * DEG };
}

/**
 * How far the blade has come toward the point, where 1 is the point
 * itself. It is the lesser of the two shares, so rising without swinging
 * right (or the other way round) never gets there.
 */
export function parryProgress(pose: { pitch: number; yaw: number }, point: ParryPoint): number {
  return Math.min(pose.pitch / point.rise, pose.yaw / point.right);
}
