import * as THREE from "three";
import type { Rig } from "../models/rig";
import { solveLimb, type Limb } from "./ik";
import type { LegFrame } from "./legs";

/** The torso and head, in radians. Bend tips forward, twist turns left, lean tips to the left. */
export interface UpperFrame {
  bend: number;
  twist: number;
  lean: number;
  headPitch: number;
  headYaw: number;
}

export function blankUpper(): UpperFrame {
  return { bend: 0, twist: 0, lean: 0, headPitch: 0, headYaw: 0 };
}

const v = new THREE.Vector3();
const pole = new THREE.Vector3();
const q = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const e = new THREE.Euler();

function limb(upper: THREE.Object3D, middle: THREE.Object3D, a: number, b: number, bend: 1 | -1): Limb {
  return { upper, middle, a, b, bend };
}

/** Poses the pelvis, spine, chest and head. Matrices are brought up to date for the IK that follows. */
export function poseTorso(rig: Rig, legs: LegFrame, up: UpperFrame): void {
  rig.pelvis.position.set(legs.hipX, legs.hipY, legs.hipZ);
  rig.pelvis.rotation.set(legs.hipPitch, legs.hipYaw, legs.hipRoll, "YXZ");
  // The bend and twist are shared between the lower back and the chest; the lean mostly in the chest.
  // The pelvis's own turn is taken back out, so the shoulders face where the upper frame says.
  rig.spine.rotation.set(up.bend * 0.45 - legs.hipPitch * 0.5, (up.twist - legs.hipYaw) * 0.4, up.lean * 0.35 - legs.hipRoll * 0.7, "YXZ");
  rig.chest.rotation.set(up.bend * 0.55 - legs.hipPitch * 0.5, (up.twist - legs.hipYaw) * 0.6, up.lean * 0.65 - legs.hipRoll * 0.3, "YXZ");
  rig.neck.rotation.set(up.headPitch * 0.4, up.headYaw * 0.4, -up.lean * 0.3, "YXZ");
  rig.head.rotation.set(up.headPitch * 0.6, up.headYaw * 0.6, -up.lean * 0.4, "YXZ");
  rig.root.updateMatrixWorld(true);
}

/** Puts a joint's world turn to `world`, whatever its parent is doing. */
export function setWorldQuaternion(o: THREE.Object3D, world: THREE.Quaternion): void {
  o.parent!.getWorldQuaternion(q2);
  o.quaternion.copy(q2.invert().multiply(world));
}

/** Solves both legs to the frame's ankles and lays each foot at its pitch, facing the body's way. */
export function poseLegs(rig: Rig, f: LegFrame): void {
  const z = rig.size;
  const solve = (hip: THREE.Object3D, knee: THREE.Object3D, ankle: THREE.Object3D, foot: readonly number[], poleDir: readonly number[], toe: number) => {
    v.set(foot[0]!, foot[1]!, foot[2]!);
    rig.root.localToWorld(v);
    rig.pelvis.worldToLocal(v);
    // The pole is given in the body's space: take it into the pelvis's.
    pole.set(poleDir[0]!, poleDir[1]!, poleDir[2]!).applyQuaternion(rig.root.quaternion);
    rig.pelvis.getWorldQuaternion(q);
    pole.applyQuaternion(q.invert());
    solveLimb(limb(hip, knee, z.thigh, z.shin, 1), v, pole);
    hip.updateMatrixWorld(true);
    rig.root.getWorldQuaternion(q);
    q.multiply(q2.setFromEuler(e.set(toe, f.hipYaw * 0.3, 0, "YXZ")));
    setWorldQuaternion(ankle, q);
  };
  solve(rig.hipL, rig.kneeL, rig.ankleL, f.footL, f.poleL, f.toeL);
  solve(rig.hipR, rig.kneeR, rig.ankleR, f.footR, f.poleR, f.toeR);
}

/**
 * Reaches both arms for the hands' targets (world points), elbows down
 * and out, then turns each hand to its world orientation.
 */
export function poseArms(rig: Rig, left: THREE.Vector3, right: THREE.Vector3, turnL: THREE.Quaternion, turnR: THREE.Quaternion): void {
  const z = rig.size;
  const solve = (shoulder: THREE.Object3D, elbow: THREE.Object3D, hand: THREE.Object3D, target: THREE.Vector3, side: 1 | -1, turn: THREE.Quaternion) => {
    v.copy(target);
    rig.chest.worldToLocal(v);
    // Elbows hang down and out to the side, a little behind.
    pole.set(side * 0.7, -1, -0.35);
    solveLimb(limb(shoulder, elbow, z.upperArm, z.foreArm, -1), v, pole);
    shoulder.updateMatrixWorld(true);
    setWorldQuaternion(hand, turn);
  };
  solve(rig.shoulderL, rig.elbowL, rig.handL, left, 1, turnL);
  solve(rig.shoulderR, rig.elbowR, rig.handR, right, -1, turnR);
}
