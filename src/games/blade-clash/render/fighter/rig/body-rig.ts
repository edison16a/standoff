import * as THREE from "three";
import { flatten, placeAlong, placeLimb, placeUpright, twoBone, type Limb } from "./ik";
import type { Pose } from "./pose";
import { BODY, BONES, type BoneName } from "./skeleton";
import { emptyTorso, torsoFrame, wristFor } from "./torso-frame";

const Y = new THREE.Vector3(0, 1, 0);
/** Elbows bend down and out, knees forward and a touch out. */
const ELBOW_R = new THREE.Vector3(-0.25, -1, 0.6);
const ELBOW_L = new THREE.Vector3(-0.25, -1, -0.6);
/** A limb may stretch this much past its length before it lets its end fall short. */
const MAX_STRETCH = 1.12;

function limbScratch(): Limb {
  return { joint: new THREE.Vector3(), end: new THREE.Vector3(), bend: new THREE.Vector3(), stretch: 1 };
}

/**
 * The shared skeleton. Each bone is a group, placed every frame straight
 * from the pose: the chest from the spine's angles, the arms and legs by
 * two bone inverse kinematics, so the sword hand lands exactly on the grip
 * the engine says and the feet stay where the animator planted them.
 */
export class BodyRig {
  readonly root = new THREE.Group();
  readonly bones = {} as Record<BoneName, THREE.Group>;
  private readonly torso = emptyTorso();
  private readonly arm = limbScratch();
  private readonly leg = limbScratch();
  private readonly v = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() };
  private readonly q = { grip: new THREE.Quaternion(), free: new THREE.Quaternion() };

  constructor() {
    for (const name of BONES) {
      const bone = new THREE.Group();
      bone.name = name;
      this.bones[name] = bone;
      this.root.add(bone);
    }
  }

  update(pose: Pose): void {
    const t = torsoFrame(pose, this.torso);
    const { a, b, c } = this.v;
    const bones = this.bones;

    // The pelvis follows the hips' turn and a third of the spine's tip.
    a.set(Math.cos(pose.hipsYaw), 0, -Math.sin(pose.hipsYaw));
    b.copy(Y).lerp(t.up, 0.35).normalize();
    placeUpright(bones.pelvis, pose.hips, a, b);
    placeUpright(bones.chest, pose.hips, t.front, t.up);

    // The head nods and turns against the chest.
    a.copy(t.front).applyAxisAngle(t.up, -pose.turn);
    b.copy(t.up).multiplyScalar(Math.cos(pose.nod)).addScaledVector(a, Math.sin(pose.nod));
    c.copy(a).multiplyScalar(Math.cos(pose.nod)).addScaledVector(t.up, -Math.sin(pose.nod));
    placeUpright(bones.head, t.neck, c, b);

    this.swordArm(pose, t.shoulderR, t.up);
    this.freeArm(pose, t.shoulderL, t.up);
    placeAlong(bones.sword, pose.grip, pose.blade, pose.edge);

    // Legs: from the hip joints down to the ankles the animator planted.
    const side = this.v.d.set(Math.sin(pose.hipsYaw), 0, Math.cos(pose.hipsYaw));
    for (const [s, sign] of [["R", 1], ["L", -1]] as const) {
      const hip = a.copy(pose.hips).addScaledVector(side, (sign * BODY.hipWidth) / 2).addScaledVector(Y, -0.07);
      const ankle = s === "R" ? pose.footR : pose.footL;
      const toe = s === "R" ? pose.toeR : pose.toeL;
      const knee = b.set(Math.cos(toe), 0, -Math.sin(toe) + sign * 0.15);
      const leg = twoBone(hip, ankle, BODY.thigh, BODY.shin, knee, this.leg);
      placeLimb(bones[`thigh${s}`], hip, leg.joint, leg.bend);
      placeLimb(bones[`shin${s}`], leg.joint, leg.end, leg.bend);
      // The foot stays flat while the shin stands, and turns its sole forward as the leg lies down.
      const shinUp = c.copy(leg.joint).sub(leg.end).normalize();
      const lying = THREE.MathUtils.clamp((0.6 - shinUp.y) / 0.6, 0, 1);
      const footUp = shinUp.lerp(Y, 1 - lying).normalize();
      const toes = knee.set(Math.cos(toe), 0, -Math.sin(toe)).lerp(Y, lying);
      placeUpright(bones[`foot${s}`], leg.end, flatten(toes, footUp, toes), footUp);
    }
  }

  /** The sword arm reaches the fist, which sits on the grip unless the sword has been dropped. */
  private swordArm(pose: Pose, shoulder: THREE.Vector3, up: THREE.Vector3): void {
    const along = pose.holding ? pose.blade : this.v.a.copy(pose.hand).sub(shoulder).normalize();
    const wrist = wristFor(pose.hand, along, shoulder, this.v.b);
    this.reach("R", shoulder, wrist, ELBOW_R);
    placeAlong(this.bones.handR, pose.hand, along, pose.holding ? pose.edge : up);
  }

  /** The free arm: its fist on the grip below the sword hand, or free, or anywhere between. */
  private freeArm(pose: Pose, shoulder: THREE.Vector3, up: THREE.Vector3): void {
    const free = this.v.c.copy(pose.offHand).sub(shoulder).normalize();
    const along = this.v.a.copy(free).lerp(pose.blade, pose.offGrip).normalize();
    const wrist = wristFor(pose.offHand, along, shoulder, this.v.b);
    this.reach("L", shoulder, wrist, ELBOW_L);
    const hand = this.bones.handL;
    placeAlong(hand, pose.offHand, pose.blade, pose.edge);
    this.q.grip.copy(hand.quaternion);
    placeAlong(hand, pose.offHand, free, up);
    hand.quaternion.slerp(this.q.grip, pose.offGrip);
  }

  /** Two bone reach from the shoulder, stretching a little rather than leave the hand behind. */
  private reach(side: "R" | "L", shoulder: THREE.Vector3, wrist: THREE.Vector3, pole: THREE.Vector3): void {
    const arm = twoBone(shoulder, wrist, BODY.upperArm, BODY.forearm, pole, this.arm);
    const stretch = Math.min(MAX_STRETCH, Math.max(1, arm.stretch));
    if (stretch > 1) arm.joint.copy(shoulder).lerp(wrist, BODY.upperArm / (BODY.upperArm + BODY.forearm)).addScaledVector(arm.bend, 0.004);
    const end = stretch > 1 ? wrist : arm.end;
    placeLimb(this.bones[`upperArm${side}`], shoulder, arm.joint, this.v.d.copy(arm.bend).negate(), stretch);
    placeLimb(this.bones[`forearm${side}`], arm.joint, end, this.v.d.copy(arm.bend).negate(), stretch);
  }
}
