import * as THREE from "three";
import type { Look } from "../../looks";

/** The joints the animations turn. Every limb segment hangs down its joint's -y. */
export interface Rig {
  root: THREE.Group;
  /** Lifts, tips and rolls the whole body, for slides, dives and jumps. */
  body: THREE.Object3D;
  hips: THREE.Object3D;
  spine: THREE.Object3D;
  /** The rib cage, which breathes. No pose sets it. */
  chest: THREE.Object3D;
  neck: THREE.Object3D;
  shoulderL: THREE.Object3D;
  elbowL: THREE.Object3D;
  shoulderR: THREE.Object3D;
  elbowR: THREE.Object3D;
  hipL: THREE.Object3D;
  kneeL: THREE.Object3D;
  ankleL: THREE.Object3D;
  hipR: THREE.Object3D;
  kneeR: THREE.Object3D;
  ankleR: THREE.Object3D;
  handL: THREE.Object3D;
  handR: THREE.Object3D;
  /** Hip height standing, in metres. */
  hipHeight: number;
  height: number;
  dispose(): void;
}

/** Every bone that moves vertices, in skinning order. */
export const BONES = [
  "hips", "spine", "chest", "neck",
  "shoulderL", "elbowL", "handL", "shoulderR", "elbowR", "handR",
  "hipL", "kneeL", "ankleL", "hipR", "kneeR", "ankleR",
] as const;
export type BoneName = (typeof BONES)[number];

/**
 * The measurements of one body, in metres. `s` is height over 1.8 m and
 * scales every bone; `b` is the build, 0 slight to 1 powerful. These
 * are the lengths the leg solver works with too (anim/leg-ik.ts).
 */
export interface Dims {
  s: number;
  b: number;
  hipY: number;
  spineUp: number;
  torso: number;
  shoulderX: number;
  shoulderDown: number;
  upper: number;
  fore: number;
  /** From the wrist to the hand bone, which sits in the palm. */
  palm: number;
  hipW: number;
  thigh: number;
  shin: number;
  /** The head's centre over the neck joint. */
  headUp: number;
}

export function dimsOf(look: Look): Dims {
  const s = look.height / 1.8;
  const b = look.build;
  const armR = (0.056 + 0.018 * b) * s;
  return {
    s,
    b,
    hipY: 0.94 * s,
    spineUp: 0.04 * s,
    torso: 0.54 * s,
    shoulderX: (0.185 + 0.04 * b) * s,
    shoulderDown: 0.07 * s,
    upper: 0.29 * s,
    fore: 0.26 * s,
    palm: armR,
    hipW: (0.095 + 0.015 * b) * s,
    thigh: 0.44 * s,
    shin: 0.43 * s,
    headUp: 0.14 * s,
  };
}

/** Where every bone sits at rest, in the model's own space: standing tall, facing +z, the left side on +x. */
export function restPositions(d: Dims): Record<BoneName, THREE.Vector3> {
  const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
  const spineY = d.hipY + d.spineUp;
  const shY = spineY + d.torso - d.shoulderDown;
  const legY = d.hipY - 0.02 * d.s;
  return {
    hips: v(0, d.hipY),
    spine: v(0, spineY),
    chest: v(0, spineY + 0.3 * d.s, 0.02 * d.s),
    neck: v(0, spineY + d.torso),
    shoulderL: v(d.shoulderX, shY),
    elbowL: v(d.shoulderX, shY - d.upper),
    handL: v(d.shoulderX, shY - d.upper - d.fore - d.palm),
    shoulderR: v(-d.shoulderX, shY),
    elbowR: v(-d.shoulderX, shY - d.upper),
    handR: v(-d.shoulderX, shY - d.upper - d.fore - d.palm),
    hipL: v(d.hipW, legY),
    kneeL: v(d.hipW, legY - d.thigh),
    ankleL: v(d.hipW, legY - d.thigh - d.shin),
    hipR: v(-d.hipW, legY),
    kneeR: v(-d.hipW, legY - d.thigh),
    ankleR: v(-d.hipW, legY - d.thigh - d.shin),
  };
}

const PARENT: Record<BoneName, BoneName | "body"> = {
  hips: "body", spine: "hips", chest: "spine", neck: "spine",
  shoulderL: "spine", elbowL: "shoulderL", handL: "elbowL",
  shoulderR: "spine", elbowR: "shoulderR", handR: "elbowR",
  hipL: "hips", kneeL: "hipL", ankleL: "kneeL", hipR: "hips", kneeR: "hipR", ankleR: "kneeR",
};

export interface Skeleton {
  rig: Omit<Rig, "dispose">;
  bones: THREE.Bone[];
}

/**
 * A fresh set of bones for one player, at rest. Bones are plain joints
 * the poses turn; the skinned meshes bound to them bend smoothly across
 * each joint. Every player has their own bones but shares the meshes.
 */
export function buildSkeleton(d: Dims, height: number): Skeleton {
  const rest = restPositions(d);
  const root = new THREE.Group();
  const body = new THREE.Bone();
  root.add(body);
  const made = new Map<BoneName | "body", THREE.Object3D>([["body", body]]);
  const bones: THREE.Bone[] = [];
  for (const name of BONES) {
    const bone = new THREE.Bone();
    bone.name = name;
    const parent = PARENT[name];
    const at = rest[name].clone();
    if (parent !== "body") at.sub(rest[parent]);
    bone.position.copy(at);
    made.get(parent)!.add(bone);
    made.set(name, bone);
    bones.push(bone);
  }
  root.updateMatrixWorld(true);
  const get = (n: BoneName) => made.get(n)!;
  return {
    bones,
    rig: {
      root, body,
      hips: get("hips"), spine: get("spine"), chest: get("chest"), neck: get("neck"),
      shoulderL: get("shoulderL"), elbowL: get("elbowL"), handL: get("handL"),
      shoulderR: get("shoulderR"), elbowR: get("elbowR"), handR: get("handR"),
      hipL: get("hipL"), kneeL: get("kneeL"), ankleL: get("ankleL"),
      hipR: get("hipR"), kneeR: get("kneeR"), ankleR: get("ankleR"),
      hipHeight: d.hipY,
      height,
    },
  };
}
