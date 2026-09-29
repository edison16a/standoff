import type { Rig } from "../models/body";
import type { Pose } from "./pose";

/** Copies a pose onto the rig's joints. */
export function applyPose(rig: Rig, p: Pose): void {
  rig.body.position.set(p.side, p.lift, p.fwd);
  rig.body.rotation.set(p.pitch, p.yaw, p.roll, "YXZ");
  rig.spine.rotation.set(p.spineX, p.spineY, p.spineZ, "YXZ");
  rig.neck.rotation.set(p.neckX, p.neckY, 0, "YXZ");
  // The left side is +x, so spreading it out is a positive turn about z and the right a negative one.
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
