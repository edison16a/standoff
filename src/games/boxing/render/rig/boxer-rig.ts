import * as THREE from "three";
import type { Hand } from "../../engine/types";
import type { BoxerModel, Limb } from "../models/boxer-model";
import { solveTwoBone } from "./ik";
import type { RigPose, Turn } from "./pose";

const tmp = {
  a: new THREE.Vector3(),
  b: new THREE.Vector3(),
  x: new THREE.Vector3(),
  y: new THREE.Vector3(),
  z: new THREE.Vector3(),
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  parent: new THREE.Quaternion(),
  rootInverse: new THREE.Quaternion(),
};
const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);

function setTurn(object: THREE.Object3D, turn: Turn): void {
  object.rotation.set(turn.pitch, turn.yaw, -turn.lean, "YXZ");
}

/**
 * Poses a boxer model from a RigPose: the trunk and head by angles, then
 * each arm and leg by reaching for its target with two bone IK. Hands
 * and feet are given in the model's own space, so the rig never cares
 * where the boxer stands or how tall the look is.
 */
export class BoxerRig {
  constructor(readonly model: BoxerModel) {}

  apply(pose: RigPose): void {
    this.applyBody(pose);
    this.applyLimbs(pose);
  }

  /** The root, trunk and head. Hand targets can then be worked out against the posed chest. */
  applyBody(pose: RigPose): void {
    const m = this.model;
    m.root.position.set(pose.x, 0, pose.z);
    m.root.rotation.set(0, pose.yaw, 0);
    m.hips.position.y = pose.hipHeight;
    setTurn(m.hips, pose.hips);
    setTurn(m.spine, pose.spine);
    setTurn(m.chest, pose.chest);
    setTurn(m.head, pose.head);
    m.root.updateMatrixWorld(true);
    m.root.getWorldQuaternion(tmp.rootInverse).invert();
  }

  /** Arms and legs, reaching for the pose's hands and feet. Call after applyBody. */
  applyLimbs(pose: RigPose): void {
    for (const hand of ["left", "right"] as const) {
      this.reachArm(hand, pose);
      this.reachLeg(hand, pose);
    }
  }

  /** A joint's place in the model's own space. */
  local(object: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 {
    object.getWorldPosition(out);
    return this.model.root.worldToLocal(out);
  }

  /** A point given against the chest, moved into the model's own space. */
  chestToModel(point: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    out.copy(point);
    this.model.chest.localToWorld(out);
    return this.model.root.worldToLocal(out);
  }

  /** A point in the world, moved into the model's own space. */
  worldToModel(point: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    return this.model.root.worldToLocal(out.copy(point));
  }

  shoulder(hand: Hand, out: THREE.Vector3): THREE.Vector3 {
    return this.local(this.model.arms[hand].root, out);
  }

  private reachArm(hand: Hand, pose: RigPose): void {
    const limb = this.model.arms[hand];
    const shoulder = this.local(limb.root, tmp.a.clone());
    const { target, pole } = pose.hands[hand];
    const { middle, end } = solveTwoBone(shoulder, target, pole, limb.upper, limb.lower);
    // The biceps face the way the forearm folds, or away from the elbow's point when the arm is straight.
    const bend = end.clone().sub(middle);
    const upperDir = middle.clone().sub(shoulder).normalize();
    if (bend.clone().addScaledVector(upperDir, -bend.dot(upperDir)).lengthSq() < 1e-6) bend.copy(shoulder).sub(pole);
    this.aim(limb.root, upperDir, bend);
    const foreDir = end.clone().sub(middle).normalize();
    // The back of the glove faces up on a straight punch and forward in a high guard, and rolls in for a hook.
    const back = tmp.b.copy(UP).addScaledVector(FORWARD, 0.4);
    const roll = pose.gloveRoll[hand];
    back.addScaledVector(tmp.x.set(hand === "left" ? -1 : 1, 0, 0), roll * 0.8);
    this.aim(limb.middle, foreDir, back.clone());
  }

  private reachLeg(hand: Hand, pose: RigPose): void {
    const limb: Limb = this.model.legs[hand];
    const hip = this.local(limb.root, tmp.a.clone());
    const plant = pose.feet[hand];
    const side = hand === "left" ? 1 : -1;
    // Knees point forward and a little out, over the toes.
    const pole = hip.clone().add(new THREE.Vector3(side * 0.25 + Math.sin(plant.yaw) * 0.4, -0.3, Math.cos(plant.yaw) * 1.2));
    const { middle, end } = solveTwoBone(hip, plant.position, pole, limb.upper, limb.lower);
    const front = pole.clone().sub(hip);
    this.aim(limb.root, middle.clone().sub(hip).normalize(), front);
    this.aim(limb.middle, end.clone().sub(middle).normalize(), front);
    limb.end.position.copy(end);
    limb.end.rotation.set(0, plant.yaw, 0);
  }

  /**
   * Turns a joint so its bone (local -y) runs along `direction` and its
   * front (local +z) faces as near `front` as it can. Both are in the
   * model's own space.
   */
  private aim(joint: THREE.Object3D, direction: THREE.Vector3, front: THREE.Vector3): void {
    const y = tmp.y.copy(direction).negate();
    const z = tmp.z.copy(front).addScaledVector(y, -front.dot(y));
    if (z.lengthSq() < 1e-8) z.set(0, 0, 1).addScaledVector(y, -y.z);
    z.normalize();
    const x = tmp.x.crossVectors(y, z);
    tmp.m.makeBasis(x, y, z);
    tmp.q.setFromRotationMatrix(tmp.m);
    joint.parent!.getWorldQuaternion(tmp.parent);
    tmp.parent.premultiply(tmp.rootInverse).invert();
    joint.quaternion.copy(tmp.parent.multiply(tmp.q));
    joint.updateMatrixWorld(true);
  }
}
