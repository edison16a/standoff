import { magazineReload, type TimedStep } from "../../../ballistics";
import type { WeaponId } from "../../../engine/weapons";
import type { GunPose } from "../pose";
import { akReload } from "./ak47";
import type { ReloadInput } from "./common";
import { rifleReload } from "./rifle";
import { shotgunLength, shotgunReload, shotgunSteps } from "./shotgun";
import { smgReload } from "./smg";

export type { ReloadInput } from "./common";
export { counted as shellCounted, shellCount } from "./shotgun";

const CHOREOGRAPHY: Record<WeaponId, (pose: GunPose, input: ReloadInput) => GunPose> = {
  rifle: rifleReload,
  ak47: akReload,
  smg: smgReload,
  shotgun: shotgunReload,
};

/** The steps of one reload from the shared timelines, which the sound plays from too. */
export function reloadSteps(weapon: WeaponId, seconds: number, empty: boolean): TimedStep[] {
  return weapon === "shotgun" ? shotgunSteps(seconds, empty) : magazineReload(weapon, seconds, empty);
}

/**
 * How long the reload's picture runs. A magazine reload ends with the
 * engine's; the shotgun's racks its pump or lowers after the last shell,
 * a moment past the engine counting it full.
 */
export function reloadLength(weapon: WeaponId, seconds: number, empty: boolean): number {
  return weapon === "shotgun" ? shotgunLength(seconds, empty) : seconds;
}

/**
 * The gun's pose `input.t` seconds into a reload, laid over `pose`, the
 * held gun with its shot cycle already applied. Pure, so the timing can
 * be tested without a renderer.
 */
export function reloadPose(weapon: WeaponId, pose: GunPose, input: ReloadInput): GunPose {
  return CHOREOGRAPHY[weapon](pose, input);
}
