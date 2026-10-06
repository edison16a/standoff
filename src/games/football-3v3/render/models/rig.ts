import * as THREE from "three";

/**
 * The skeleton every player shares: pelvis, spine and neck, two arms and
 * two legs of two segments each. At rest the player stands straight
 * facing +z with the arms hanging, and the left side is +x. Every limb
 * segment hangs down its bone's -y, so a pose is just joint angles.
 */
export interface Bones {
  hips: THREE.Bone;
  spine: THREE.Bone;
  neck: THREE.Bone;
  shoulderL: THREE.Bone;
  elbowL: THREE.Bone;
  handL: THREE.Bone;
  shoulderR: THREE.Bone;
  elbowR: THREE.Bone;
  handR: THREE.Bone;
  hipL: THREE.Bone;
  kneeL: THREE.Bone;
  ankleL: THREE.Bone;
  hipR: THREE.Bone;
  kneeR: THREE.Bone;
  ankleR: THREE.Bone;
}

export type BoneName = keyof Bones;

/** Skinning order: a vertex names its bones by these indices. */
export const BONE_NAMES: readonly BoneName[] = [
  "hips", "spine", "neck",
  "shoulderL", "elbowL", "handL", "shoulderR", "elbowR", "handR",
  "hipL", "kneeL", "ankleL", "hipR", "kneeR", "ankleR",
];

export const boneIndex = (name: BoneName): number => BONE_NAMES.indexOf(name);

/** Lengths and spots in metres, all at rest, measured from the ground under the player. */
export interface Dims {
  height: number;
  /** 0 for a lean build up to about 1.4 for a lineman. */
  build: number;
  ankleY: number;
  shin: number;
  thigh: number;
  hipY: number;
  hipX: number;
  spineY: number;
  neckY: number;
  shoulderX: number;
  shoulderY: number;
  upper: number;
  fore: number;
  /** From the wrist to the middle of the palm, where the hand bone sits. */
  palm: number;
  /** The middle of the head above the neck bone. */
  head: number;
  /** Heads vary less than bodies, so they scale by the square root of height. */
  headScale: number;
  /** The cleat: heel and toe along z from the ankle. */
  heel: number;
  toe: number;
}

/** Real proportions for a player of `height` metres and build `b`. */
export function dimsFor(height: number, b: number): Dims {
  const H = height;
  const ankleY = 0.046 * H;
  const shin = 0.243 * H;
  const thigh = 0.244 * H;
  const hipY = ankleY + shin + thigh;
  const neckY = 0.832 * H;
  return {
    height: H, build: b, ankleY, shin, thigh, hipY,
    hipX: (0.05 + 0.006 * b) * H,
    spineY: hipY + 0.035 * H,
    neckY,
    shoulderX: (0.104 + 0.01 * b) * H,
    shoulderY: 0.8 * H,
    upper: 0.172 * H,
    fore: 0.148 * H,
    palm: 0.03 * H,
    head: 0.092 * H,
    headScale: Math.sqrt(H / 1.85),
    heel: -0.05 * H,
    toe: 0.105 * H,
  };
}

export interface Skeleton {
  bones: Bones;
  /** In skinning order. */
  list: THREE.Bone[];
}

/** Builds the bones at rest under `parent`. */
export function buildBones(d: Dims, parent: THREE.Object3D): Skeleton {
  const bone = (name: BoneName, up: THREE.Object3D, x: number, y: number, z = 0) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    up.add(b);
    return b;
  };
  const hips = bone("hips", parent, 0, d.hipY);
  const spine = bone("spine", hips, 0, d.spineY - d.hipY);
  const neck = bone("neck", spine, 0, d.neckY - d.spineY);
  const arm = (side: 1 | -1, k: "L" | "R") => {
    const shoulder = bone(`shoulder${k}`, spine, side * d.shoulderX, d.shoulderY - d.spineY);
    const elbow = bone(`elbow${k}`, shoulder, 0, -d.upper);
    return { shoulder, elbow, hand: bone(`hand${k}`, elbow, 0, -d.fore - d.palm) };
  };
  const leg = (side: 1 | -1, k: "L" | "R") => {
    const hip = bone(`hip${k}`, hips, side * d.hipX, 0);
    const knee = bone(`knee${k}`, hip, 0, -d.thigh);
    return { hip, knee, ankle: bone(`ankle${k}`, knee, 0, -d.shin) };
  };
  const [L, R, LL, RL] = [arm(1, "L"), arm(-1, "R"), leg(1, "L"), leg(-1, "R")];
  const bones: Bones = {
    hips, spine, neck,
    shoulderL: L.shoulder, elbowL: L.elbow, handL: L.hand, shoulderR: R.shoulder, elbowR: R.elbow, handR: R.hand,
    hipL: LL.hip, kneeL: LL.knee, ankleL: LL.ankle, hipR: RL.hip, kneeR: RL.knee, ankleR: RL.ankle,
  };
  return { bones, list: BONE_NAMES.map((n) => bones[n]) };
}
