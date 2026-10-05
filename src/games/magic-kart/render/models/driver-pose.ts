import * as THREE from "three";
import { solveElbow } from "./kit/arm-ik";
import { pole, type BoneName, type Rig } from "./parts/driver-rig";

/** How far the steering wheel turns at full lock, radians. */
export const WHEEL_LOCK = 1.05;

const spineQ = new THREE.Quaternion();
const upperQ = new THREE.Quaternion();
const foreQ = new THREE.Quaternion();
const inv = new THREE.Quaternion();
const shoulder = new THREE.Vector3();
const wrist = new THREE.Vector3();
const elbow = new THREE.Vector3();
const restDir = new THREE.Vector3();
const nowDir = new THREE.Vector3();
const bend = new THREE.Vector3();
const euler = new THREE.Euler();

export interface DriverMood {
  steer: number;
  /** Body roll of the kart, so the driver leans against it. */
  roll: number;
  brake: number;
  boost: number;
}

/**
 * Poses the driver for a frame: the steering wheel turns round its
 * column, the hands turn with it, and each arm bends at the elbow to keep
 * the hand on the rim. The driver leans into the bend against the body
 * roll, tips forward under braking and is pressed back by a boost, and the
 * head looks where the kart is going.
 */
export function poseDriver(rig: Rig, bones: Record<BoneName, THREE.Bone>, m: DriverMood): void {
  const j = rig.joints;
  const wheelAngle = -m.steer * WHEEL_LOCK;
  bones.wheel.quaternion.setFromAxisAngle(rig.columnAxis, wheelAngle);
  euler.set(m.brake * 0.09 - m.boost * 0.07, -m.steer * 0.08, m.steer * 0.11 - m.roll * 0.6, "YXZ");
  spineQ.setFromEuler(euler);
  bones.spine.quaternion.copy(spineQ);
  euler.set(-m.brake * 0.05, -m.steer * 0.38, m.steer * 0.08 - m.roll * 0.4, "YXZ");
  bones.head.quaternion.setFromEuler(euler);
  for (const [upperName, foreName, side] of [["upperL", "foreL", 1], ["upperR", "foreR", -1]] as const) {
    const restWrist = side > 0 ? rig.wrists.L : rig.wrists.R;
    shoulder.copy(j[upperName]).sub(j.spine).applyQuaternion(spineQ).add(j.spine);
    wrist.copy(restWrist).sub(j.wheel).applyQuaternion(bones.wheel.quaternion).add(j.wheel);
    const reached = solveElbow(shoulder, wrist, rig.upper, rig.fore, bend.copy(pole(side)).applyQuaternion(spineQ), elbow);
    // Upper arm: from its rest direction to shoulder toward elbow, then into the spine's frame.
    restDir.copy(j[foreName]).sub(j[upperName]).normalize();
    nowDir.copy(elbow).sub(shoulder).normalize();
    upperQ.setFromUnitVectors(restDir, nowDir);
    bones[upperName].quaternion.copy(inv.copy(spineQ).invert().multiply(upperQ));
    // Forearm: from its rest direction to elbow toward wrist, in the upper arm's frame.
    restDir.copy(restWrist).sub(j[foreName]).normalize();
    nowDir.copy(reached).sub(elbow).normalize();
    foreQ.setFromUnitVectors(restDir, nowDir);
    bones[foreName].quaternion.copy(inv.copy(upperQ).invert().multiply(foreQ));
  }
}
