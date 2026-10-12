import type { WeaponId } from "../../engine/weapons";
import { GRIPS } from "./hands/grips";
import type { GunPose, V3 } from "./pose";

/**
 * How far each part runs at full stroke, in metres. The poses speak in
 * shares of these, and the rig and the hands that ride on a part turn
 * them into distances with the same numbers.
 */
export const TRAVEL: Record<WeaponId, { handle: number; pump: number }> = {
  rifle: { handle: 0.06, pump: 0 },
  ak47: { handle: 0.09, pump: 0 },
  smg: { handle: 0.072, pump: 0 },
  shotgun: { handle: 0, pump: 0.08 },
};

/** Where each magazine sits in its well, matching the models, so hands can find it. */
export const MAG_HOME: Record<Exclude<WeaponId, "shotgun">, V3> = {
  rifle: [0, -0.09, -0.07],
  ak47: [0, -0.034, -0.108],
  smg: [0, -0.052, -0.09],
};

const ZERO: V3 = [0, 0, 0];

/** The gun just held: everything home, the spare and the loose shell put away, hands on their grips. */
export function restPose(weapon: WeaponId): GunPose {
  const grips = GRIPS[weapon];
  return {
    body: { pos: ZERO, rot: ZERO },
    mag: { pos: ZERO, rot: ZERO, shown: 1 },
    spare: { pos: ZERO, rot: ZERO, shown: 0 },
    shell: { pos: [0, -0.09, -0.02], rot: ZERO, shown: 0 },
    carrier: 0,
    handle: 0,
    handleLock: 0,
    pump: 0,
    cover: 0,
    support: grips.support,
    grip: grips.grip,
    dropped: false,
  };
}
