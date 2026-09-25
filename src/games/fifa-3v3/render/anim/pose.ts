import type { Rig } from "../models/body";

/**
 * A pose is a flat set of joint angles in radians, plus the body's lift
 * and tilt. Flat numbers blend easily, so one pose can ease into the
 * next without any snapping.
 *
 * Signs: a positive hip or shoulder X swings the limb backward, a
 * positive knee bends the heel up behind, a negative elbow bends the
 * forearm forward. Z spreads a limb out to the side (positive is out
 * for both sides, mirrored when applied). Body pitch tips forward.
 */
export const JOINTS = [
  "lift", "fwd", "pitch", "roll", "yaw",
  "spineX", "spineY", "spineZ", "neckX", "neckY",
  "shLX", "shLY", "shLZ", "elL", "shRX", "shRY", "shRZ", "elR",
  "hipLX", "hipLZ", "kneeL", "ankL", "hipRX", "hipRZ", "kneeR", "ankR",
] as const;

export type Joint = (typeof JOINTS)[number];
export type Pose = Record<Joint, number>;

export function neutral(): Pose {
  const pose = {} as Pose;
  for (const j of JOINTS) pose[j] = 0;
  // Arms rest a touch away from the body, elbows soft.
  pose.shLZ = 0.12;
  pose.shRZ = 0.12;
  pose.elL = -0.15;
  pose.elR = -0.15;
  return pose;
}

/**
 * Moves `current` toward `target`, a fraction `k` of the way. The body's
 * turn goes the short way round, so a full spin in a celebration ends
 * facing the same way instead of unwinding.
 */
export function ease(current: Pose, target: Pose, k: number): void {
  for (const j of JOINTS) {
    if (j === "yaw") {
      let d = (target.yaw - current.yaw) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      current.yaw = (current.yaw + d * k) % (Math.PI * 2);
    } else current[j] += (target[j] - current[j]) * k;
  }
}

/** Writes the pose a share `t` of the way from `a` to `b` into `out`, the body's turn going the short way round. */
export function blendPoses(out: Pose, a: Pose, b: Pose, t: number): void {
  for (const j of JOINTS) {
    if (j === "yaw") {
      let d = (b.yaw - a.yaw) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      out.yaw = a.yaw + d * t;
    } else out[j] = a[j] + (b[j] - a[j]) * t;
  }
}

/** Copies a pose onto the rig's joints. */
export function applyPose(rig: Rig, p: Pose): void {
  rig.body.position.set(0, p.lift, p.fwd);
  rig.body.rotation.set(p.pitch, p.yaw, p.roll, "YXZ");
  rig.spine.rotation.set(p.spineX, p.spineY, p.spineZ, "YXZ");
  rig.neck.rotation.set(p.neckX, p.neckY, 0, "YXZ");
  // The left side is +x, so spreading it out is a positive turn about z and the right a negative one.
  // Y twists the upper arm inward about its own length, which swings the forearm across the chest.
  rig.shoulderL.rotation.set(p.shLX, -p.shLY, p.shLZ, "XZY");
  rig.shoulderR.rotation.set(p.shRX, p.shRY, -p.shRZ, "XZY");
  rig.elbowL.rotation.set(p.elL, 0, 0);
  rig.elbowR.rotation.set(p.elR, 0, 0);
  rig.hipL.rotation.set(p.hipLX, 0, p.hipLZ);
  rig.hipR.rotation.set(p.hipRX, 0, -p.hipRZ);
  rig.kneeL.rotation.set(p.kneeL, 0, 0);
  rig.kneeR.rotation.set(p.kneeR, 0, 0);
  rig.ankleL.rotation.set(p.ankL, 0, 0);
  rig.ankleR.rotation.set(p.ankR, 0, 0);
}
