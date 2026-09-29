import * as THREE from "three";
import { MeshBuilder } from "../mesh-builder";

/** Body proportions in metres. The runners, the guard and their poses all share this skeleton. */
export interface BodyDims {
  foot: number;
  shin: number;
  thigh: number;
  torso: number;
  neck: number;
  head: number;
  shoulderW: number;
  hipW: number;
  upperArm: number;
  forearm: number;
}

export const BONES = [
  "hips", "spine", "chest", "neck", "head",
  "shoulderL", "elbowL", "handL", "shoulderR", "elbowR", "handR",
  "hipL", "kneeL", "ankleL", "hipR", "kneeR", "ankleR",
] as const;
export type Bone = (typeof BONES)[number];

/**
 * A skeleton of plain groups, one per joint, so animating is only turning
 * joints. The figure faces -z, the way the runners run. Its left is -x.
 * `pivot` sits at the middle of the body, for flips and rolls, and
 * `root` at the feet, for placing it in the world.
 */
export interface Rig {
  root: THREE.Group;
  pivot: THREE.Group;
  bones: Record<Bone, THREE.Group>;
  dims: BodyDims;
  /** Hip height standing, where the pivot's children hang from. */
  hipHeight: number;
}

export function makeRig(d: BodyDims): Rig {
  const root = new THREE.Group();
  const hipHeight = d.foot + d.shin + d.thigh;
  const pivot = new THREE.Group();
  pivot.position.y = hipHeight * 0.75;
  root.add(pivot);
  const joint = (parent: THREE.Object3D, x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  const hips = joint(pivot, 0, hipHeight - pivot.position.y, 0);
  const spine = joint(hips, 0, 0.04, 0);
  const chest = joint(spine, 0, d.torso * 0.45, 0);
  const neck = joint(chest, 0, d.torso * 0.55, 0);
  const head = joint(neck, 0, d.neck, 0);
  const arm = (side: -1 | 1) => {
    const shoulder = joint(chest, (side * d.shoulderW) / 2, d.torso * 0.47, 0);
    const elbow = joint(shoulder, 0, -d.upperArm, 0);
    const hand = joint(elbow, 0, -d.forearm, 0);
    return [shoulder, elbow, hand] as const;
  };
  const leg = (side: -1 | 1) => {
    const hip = joint(hips, (side * d.hipW) / 2, -0.04, 0);
    const knee = joint(hip, 0, -d.thigh, 0);
    const ankle = joint(knee, 0, -d.shin, 0);
    return [hip, knee, ankle] as const;
  };
  const [shoulderL, elbowL, handL] = arm(-1);
  const [shoulderR, elbowR, handR] = arm(1);
  const [hipL, kneeL, ankleL] = leg(-1);
  const [hipR, kneeR, ankleR] = leg(1);
  const bones = { hips, spine, chest, neck, head, shoulderL, elbowL, handL, shoulderR, elbowR, handR, hipL, kneeL, ankleL, hipR, kneeR, ankleR };
  for (const [name, bone] of Object.entries(bones)) bone.name = name;
  return { root, pivot, bones, dims: d, hipHeight };
}

/** Collects each bone's parts, then merges them per bone, so a whole figure draws in a few dozen calls. */
export class Dresser {
  private readonly builders = new Map<Bone, MeshBuilder>();
  private readonly details = new Map<Bone, MeshBuilder>();

  constructor(private readonly rig: Rig) {}

  on(bone: Bone): MeshBuilder {
    return take(this.builders, bone);
  }

  /** Fine features, like eyes, brows and a mouth, drawn with no ink line so they read as painted on. */
  detail(bone: Bone): MeshBuilder {
    return take(this.details, bone);
  }

  finish(): Rig {
    for (const [bone, builder] of this.builders) {
      if (!builder.empty) this.rig.bones[bone].add(builder.build(`${bone}-skin`));
    }
    for (const [bone, builder] of this.details) {
      if (builder.empty) continue;
      const features = builder.build(`${bone}-features`);
      features.traverse((node) => (node.userData.noOutline = true));
      this.rig.bones[bone].add(features);
    }
    this.builders.clear();
    this.details.clear();
    return this.rig;
  }
}

function take(builders: Map<Bone, MeshBuilder>, bone: Bone): MeshBuilder {
  let builder = builders.get(bone);
  if (!builder) {
    builder = new MeshBuilder();
    builders.set(bone, builder);
  }
  return builder;
}

/** Every joint back to its rest pose, before a new frame's pose is laid on. */
export function resetPose(rig: Rig): void {
  for (const name of BONES) rig.bones[name].rotation.set(0, 0, 0);
  rig.bones.hips.position.set(0, rig.hipHeight - rig.pivot.position.y, 0);
  rig.pivot.rotation.set(0, 0, 0);
  rig.pivot.position.set(0, rig.hipHeight * 0.75, 0);
}
