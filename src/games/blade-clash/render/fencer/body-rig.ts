import * as THREE from "three";
import type { Pose } from "@/games/blade-clash/rig/skeleton";

/**
 * One skeleton for every fencer, in metres. Characters differ in what they
 * wear, never in how they move, so every animation fits all four.
 */
export const BODY = {
  thigh: 0.44,
  shin: 0.43,
  /** Ankle joint height above the sole. */
  ankle: 0.08,
  hipWidth: 0.19,
  /** Pelvis to the base of the neck. */
  torso: 0.52,
  neck: 0.09,
  shoulderWidth: 0.4,
  /** Shoulder joints sit this far below the base of the neck. */
  shoulderDrop: 0.065,
  upperArm: 0.3,
  forearm: 0.27,
} as const;

export const BONES = [
  "pelvis", "chest", "head",
  "upperArmF", "forearmF", "handF", "upperArmB", "forearmB", "handB",
  "thighF", "shinF", "footF", "thighB", "shinB", "footB",
  "blade",
] as const;
export type BoneName = (typeof BONES)[number];

/**
 * Each bone is a group, placed every frame straight from the solved joint
 * positions. Local axes follow one rule so parts are easy to model: +y runs
 * up the bone (a limb hangs down -y from its joint), +x is the bone's front
 * (the knee cap, the face, the crook of the elbow), and +z is its sword side.
 * The blade and the sword hand instead run along +x, the way the sword points.
 *
 * Fencer space: +x toward the opponent, +y up, +z toward the camera.
 */
export class BodyRig {
  readonly root = new THREE.Group();
  readonly bones = {} as Record<BoneName, THREE.Group>;
  /** The blade's tip and middle in fencer space, refreshed every update, for trails and sparks. */
  readonly tip = new THREE.Vector3();
  readonly mid = new THREE.Vector3();

  /**
   * `standing` turns the back foot and knee forward, for a figure standing
   * square, like the referee. A fencer's back foot turns out sideways.
   */
  constructor(
    private readonly bladeLength: number,
    private readonly standing = false,
  ) {
    for (const name of BONES) {
      const bone = new THREE.Group();
      bone.name = name;
      this.bones[name] = bone;
      this.root.add(bone);
    }
  }

  update(pose: Pose): void {
    const up = v(Math.sin(pose.lean), Math.cos(pose.lean), 0);
    const pelvis = v(pose.hips.x, pose.hips.y, 0);
    const chestFront = flat(turn(pose.twist), up);
    const chestSide = chestFront.clone().cross(up);
    const pelvisFront = turn(pose.twist + (this.standing ? 0 : 0.25));
    const pelvisSide = pelvisFront.clone().cross(Y);

    place(this.bones.pelvis, pelvis, pelvisFront, Y);
    place(this.bones.chest, pelvis, chestFront, up);

    const neck = pelvis.clone().addScaledVector(up, BODY.torso);
    const headUp = v(Math.sin(pose.lean + pose.nod) * 0.7, Math.cos(pose.lean + pose.nod), 0).normalize();
    const face = v(Math.cos(pose.lean + pose.nod), -Math.sin(pose.lean + pose.nod), 0);
    place(this.bones.head, neck, face, headUp);

    const shoulderLine = neck.clone().addScaledVector(up, -BODY.shoulderDrop);
    const shoulderF = shoulderLine.clone().addScaledVector(chestSide, BODY.shoulderWidth / 2);
    const shoulderB = shoulderLine.clone().addScaledVector(chestSide, -BODY.shoulderWidth / 2);

    // The sword arm: the hand goes where the pose says, the elbow hangs down and out.
    const handF = shoulderF.clone().add(v(pose.hand.x, pose.hand.y, -0.07));
    const swordArm = twoBone(shoulderF, handF, BODY.upperArm, BODY.forearm, v(-0.25, -1, 0.55));
    limb(this.bones.upperArmF, shoulderF, swordArm.joint, swordArm.pole.clone().negate());
    limb(this.bones.forearmF, swordArm.joint, swordArm.end, swordArm.pole.clone().negate());

    const blade = bladeDirection(pose.bladeAngle, pose.bladeYaw);
    const knuckles = flat(Y, blade);
    const thumbSide = knuckles.clone().multiplyScalar(Math.cos(pose.wrist)).addScaledVector(blade.clone().cross(knuckles), Math.sin(pose.wrist));
    placeAlong(this.bones.handF, swordArm.end, blade, thumbSide);
    const grip = swordArm.end.clone().addScaledVector(blade, 0.055);
    placeAlong(this.bones.blade, grip, blade, thumbSide);
    this.tip.copy(grip).addScaledVector(blade, this.bladeLength);
    this.mid.copy(grip).addScaledVector(blade, this.bladeLength * 0.45);

    // The free arm, up and behind for balance.
    const handB = shoulderB.clone().add(v(pose.backHand.x, pose.backHand.y, -0.1));
    const freeArm = twoBone(shoulderB, handB, BODY.upperArm, BODY.forearm, v(-0.7, -0.45, -0.55));
    limb(this.bones.upperArmB, shoulderB, freeArm.joint, freeArm.pole.clone().negate());
    limb(this.bones.forearmB, freeArm.joint, freeArm.end, freeArm.pole.clone().negate());
    const palm = freeArm.end.clone().sub(freeArm.joint).normalize();
    place(this.bones.handB, freeArm.end, flat(v(1, 0.3, 0), palm.clone().negate()), palm.negate());

    // Legs: the front foot points at the opponent, the back foot turns out sideways, knees over toes.
    const hipF = pelvis.clone().addScaledVector(pelvisSide, BODY.hipWidth / 2).addScaledVector(Y, -0.06);
    const hipB = pelvis.clone().addScaledVector(pelvisSide, -BODY.hipWidth / 2).addScaledVector(Y, -0.06);
    const ankleF = v(pose.frontFoot.x, pose.frontFoot.y + BODY.ankle, this.standing ? 0.13 : 0.1);
    const ankleB = v(pose.backFoot.x, pose.backFoot.y + BODY.ankle, this.standing ? -0.13 : -0.08);
    const toesB = this.standing ? v(1, 0, -0.15).normalize() : v(0.3, 0, -0.95).normalize();
    const legF = twoBone(hipF, ankleF, BODY.thigh, BODY.shin, v(1, 0, 0.2));
    const legB = twoBone(hipB, ankleB, BODY.thigh, BODY.shin, this.standing ? v(1, 0, -0.1) : v(0.55, 0, -0.8));
    limb(this.bones.thighF, hipF, legF.joint, legF.pole);
    limb(this.bones.shinF, legF.joint, legF.end, legF.pole);
    limb(this.bones.thighB, hipB, legB.joint, legB.pole);
    limb(this.bones.shinB, legB.joint, legB.end, legB.pole);
    place(this.bones.footF, legF.end, v(1, 0, 0), Y);
    place(this.bones.footB, legB.end, toesB, Y);
  }
}

const Y = new THREE.Vector3(0, 1, 0);

function v(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

/** The forward direction turned side on by `angle` around the vertical, sword shoulder leading. */
function turn(angle: number): THREE.Vector3 {
  return v(Math.cos(angle), 0, -Math.sin(angle));
}

/** `dir` with its part along `axis` removed, normalised. */
function flat(dir: THREE.Vector3, axis: THREE.Vector3): THREE.Vector3 {
  const out = dir.clone().addScaledVector(axis, -dir.dot(axis));
  return out.lengthSq() < 1e-8 ? v(1, 0, 0) : out.normalize();
}

function bladeDirection(pitch: number, yaw: number): THREE.Vector3 {
  return v(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw));
}

const basis = new THREE.Matrix4();

/** Puts a bone at `origin` with its +x toward `front` and +y along `up`. */
function place(bone: THREE.Group, origin: THREE.Vector3, front: THREE.Vector3, up: THREE.Vector3): void {
  const y = up.clone().normalize();
  const x = flat(front, y);
  const z = x.clone().cross(y);
  basis.makeBasis(x, y, z);
  bone.position.copy(origin);
  bone.quaternion.setFromRotationMatrix(basis);
}

/** Puts a limb bone at its joint, hanging toward `end`, its front toward `front`. */
function limb(bone: THREE.Group, joint: THREE.Vector3, end: THREE.Vector3, front: THREE.Vector3): void {
  place(bone, joint, front, joint.clone().sub(end));
}

/** Puts a bone whose length runs along +x (the blade and the sword hand). */
function placeAlong(bone: THREE.Group, origin: THREE.Vector3, along: THREE.Vector3, up: THREE.Vector3): void {
  const x = along.clone().normalize();
  const y = flat(up, x);
  const z = x.clone().cross(y);
  basis.makeBasis(x, y, z);
  bone.position.copy(origin);
  bone.quaternion.setFromRotationMatrix(basis);
}

/**
 * Two bone inverse kinematics: where the knee or elbow goes so the limb
 * reaches the target, bending toward `pole`. Out of reach, it straightens.
 */
export function twoBone(root: THREE.Vector3, target: THREE.Vector3, upper: number, lower: number, pole: THREE.Vector3) {
  const toTarget = target.clone().sub(root);
  const reach = Math.min(upper + lower - 1e-4, Math.max(Math.abs(upper - lower) + 1e-4, toTarget.length()));
  const dir = toTarget.lengthSq() > 1e-10 ? toTarget.normalize() : v(0, -1, 0);
  const bendDir = flat(pole, dir);
  const cos = (upper * upper + reach * reach - lower * lower) / (2 * upper * reach);
  const angle = Math.acos(Math.min(1, Math.max(-1, cos)));
  const joint = root.clone().addScaledVector(dir, upper * Math.cos(angle)).addScaledVector(bendDir, upper * Math.sin(angle));
  const end = root.clone().addScaledVector(dir, reach);
  return { joint, end, pole: bendDir };
}
