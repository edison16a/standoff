import * as THREE from "three";

/**
 * A fighter's skeleton: joints only, no meshes. The body faces +z with
 * its left side toward +x. Every limb segment hangs down its joint's -y,
 * so a joint turned to point its -y somewhere points the limb there,
 * which is what the IK in anim/ik.ts relies on.
 */
export interface Rig {
  root: THREE.Group;
  /** Tips the whole body over for a fall, about a point on the floor. */
  tilt: THREE.Group;
  pelvis: THREE.Object3D;
  spine: THREE.Object3D;
  chest: THREE.Object3D;
  neck: THREE.Object3D;
  head: THREE.Object3D;
  shoulderL: THREE.Object3D;
  elbowL: THREE.Object3D;
  handL: THREE.Object3D;
  shoulderR: THREE.Object3D;
  elbowR: THREE.Object3D;
  handR: THREE.Object3D;
  hipL: THREE.Object3D;
  kneeL: THREE.Object3D;
  ankleL: THREE.Object3D;
  hipR: THREE.Object3D;
  kneeR: THREE.Object3D;
  ankleR: THREE.Object3D;
  size: RigSize;
}

/** Bone lengths and offsets in metres, from the character's height and build. */
export interface RigSize {
  s: number;
  bulk: number;
  hipY: number;
  spineUp: number;
  chestUp: number;
  neckUp: number;
  headUp: number;
  shoulderX: number;
  shoulderY: number;
  upperArm: number;
  foreArm: number;
  hipX: number;
  thigh: number;
  shin: number;
  /** Ankle height above the sole. */
  ankle: number;
}

/** Sizes for a character of this height and build (1 is average). */
export function rigSize(height: number, bulk: number): RigSize {
  const s = height / 1.8;
  return {
    s,
    bulk,
    hipY: 0.94 * s,
    spineUp: 0.1 * s,
    chestUp: 0.2 * s,
    neckUp: 0.26 * s,
    headUp: 0.13 * s,
    shoulderX: (0.17 + 0.03 * bulk) * s,
    shoulderY: 0.22 * s,
    upperArm: 0.3 * s,
    foreArm: 0.28 * s,
    hipX: (0.085 + 0.012 * bulk) * s,
    thigh: 0.44 * s,
    shin: 0.43 * s,
    ankle: 0.07 * s,
  };
}

function joint(parent: THREE.Object3D, name: string, x: number, y: number, z = 0): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

export function buildRig(height: number, bulk: number): Rig {
  const size = rigSize(height, bulk);
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);
  const pelvis = joint(tilt, "pelvis", 0, size.hipY);
  const spine = joint(pelvis, "spine", 0, size.spineUp);
  const chest = joint(spine, "chest", 0, size.chestUp);
  const neck = joint(chest, "neck", 0, size.neckUp);
  const head = joint(neck, "head", 0, size.headUp);
  const arm = (side: 1 | -1) => {
    const shoulder = joint(chest, side > 0 ? "shoulderL" : "shoulderR", side * size.shoulderX, size.shoulderY);
    const elbow = joint(shoulder, side > 0 ? "elbowL" : "elbowR", 0, -size.upperArm);
    const hand = joint(elbow, side > 0 ? "handL" : "handR", 0, -size.foreArm);
    return { shoulder, elbow, hand };
  };
  const leg = (side: 1 | -1) => {
    const hip = joint(pelvis, side > 0 ? "hipL" : "hipR", side * size.hipX, -0.02 * size.s);
    const knee = joint(hip, side > 0 ? "kneeL" : "kneeR", 0, -size.thigh);
    const ankle = joint(knee, side > 0 ? "ankleL" : "ankleR", 0, -size.shin);
    return { hip, knee, ankle };
  };
  const L = arm(1);
  const R = arm(-1);
  const LL = leg(1);
  const RL = leg(-1);
  return {
    root, tilt, pelvis, spine, chest, neck, head,
    shoulderL: L.shoulder, elbowL: L.elbow, handL: L.hand,
    shoulderR: R.shoulder, elbowR: R.elbow, handR: R.hand,
    hipL: LL.hip, kneeL: LL.knee, ankleL: LL.ankle,
    hipR: RL.hip, kneeR: RL.knee, ankleR: RL.ankle,
    size,
  };
}
