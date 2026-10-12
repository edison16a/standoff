import type { WeaponId } from "../../../engine/weapons";
import { handRot, type HandPose, type V3 } from "../pose";

/** A hand pose from where the palm sits, which way it faces and which way the fingers reach. */
export function hand(pos: V3, palm: V3, fingers: V3, curl: number, index: number, thumb: number): HandPose {
  return { pos, rot: handRot(palm, fingers), curl, index, thumb };
}

/**
 * The right hand wraps the pistol grip from the right side: palm on the
 * grip, fingers reaching forward and curled round the front strap, the
 * index finger lying out to the trigger and the thumb over the top. The
 * fingers reach almost level, so the forearm runs on back from the wrist.
 */
const pistolGrip = (pos: V3, slope: V3): HandPose => hand(pos, [-1, 0, 0], slope, 0.95, 0.45, 0.75);

/**
 * The left hand cups the handguard from below, fingers wrapping up the
 * right side and the thumb along the left, the way most people hold a
 * carbine. Only the fingertips and thumb show from behind, so it never
 * hides the gun.
 */
const underGuard = (pos: V3, curl = 0.78): HandPose => hand([pos[0] - 0.022, pos[1], pos[2]], [0, 1, 0], [1, 0, 0], curl, curl - 0.04, 0.25);

/** Where the hands sit on each gun when it is just being held and aimed. */
export const GRIPS: Record<WeaponId, { grip: HandPose; support: HandPose }> = {
  rifle: {
    grip: pistolGrip([0.017, -0.1, 0.094], [0, -0.15, -0.99]),
    support: underGuard([0, -0.031, -0.25]),
  },
  ak47: {
    grip: pistolGrip([0.017, -0.102, 0.106], [0, -0.12, -0.99]),
    support: underGuard([0, -0.041, -0.215]),
  },
  smg: {
    grip: pistolGrip([0.018, -0.114, 0.11], [0, -0.12, -0.99]),
    support: underGuard([0, -0.039, -0.24], 0.76),
  },
  shotgun: {
    // No pistol grip: the hand takes the wrist of the stock, sloped back.
    grip: hand([0.024, -0.04, 0.125], [-1, 0, 0], [0, -0.45, -0.89], 0.7, 0.35, 0.8),
    support: underGuard([0, -0.057, -0.27]),
  },
};

/**
 * Which way each forearm runs from its wrist, in the frame of the gun's
 * resting place, so it hangs from the body however the gun turns.
 * `outward` is 1 for a gun right of centre and -1 for one on the left.
 * Each runs mostly straight down, leaning out toward the gun's own edge
 * of the screen and a little back toward the player. From the game camera
 * that takes it off the bottom of the frame within a hand's length, so
 * even a hand reaching over the top of the gun never lays its sleeve
 * across the middle of the view or a neighbour's gun.
 */
export function forearmLine(arm: "support" | "grip", outward: number): V3 {
  return arm === "support" ? [0.3 * outward, -1, 0.22] : [0.25 * outward, -1, 0.35];
}
