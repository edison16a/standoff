import * as THREE from "three";
import { merge } from "./geo";

/**
 * The skeleton every fighter shares: pelvis, torso, head, and two arms
 * and legs of two segments each. The model faces +z at rest with its
 * left side toward +x; the view turns it to face along the stage.
 */
export const BONES = [
  "hips", "torso", "neck",
  "shoulderL", "elbowL", "handL", "shoulderR", "elbowR", "handR",
  "hipL", "kneeL", "ankleL", "hipR", "kneeR", "ankleR",
] as const;
export type Bone = (typeof BONES)[number];

export type Joints = Record<Bone, THREE.Group> & { root: THREE.Group };

/** Lengths the animations and the builders need, in metres. */
export interface Dims {
  hipY: number;
  thigh: number;
  shin: number;
  torso: number;
  upper: number;
  fore: number;
  shoulderX: number;
  hipX: number;
  /** The head's centre above the neck joint, and its radius. */
  head: number;
  headR: number;
}

/** Painted geometry for each bone, solid and glowing, before merging. */
export type Parts = Partial<Record<Bone, THREE.BufferGeometry[]>>;

export interface RigSpec {
  dims: Dims;
  solid: Parts;
  glow?: Parts;
}

export interface Rig {
  joints: Joints;
  dims: Dims;
  meshes: THREE.Mesh[];
  dispose(): void;
}

const PARENT: Record<Bone, Bone | "root"> = {
  hips: "root", torso: "hips", neck: "torso",
  shoulderL: "torso", elbowL: "shoulderL", handL: "elbowL",
  shoulderR: "torso", elbowR: "shoulderR", handR: "elbowR",
  hipL: "hips", kneeL: "hipL", ankleL: "kneeL",
  hipR: "hips", kneeR: "hipR", ankleR: "kneeR",
};

function offsets(d: Dims): Record<Bone, [number, number, number]> {
  const shoulderY = d.torso * 0.9;
  return {
    hips: [0, d.hipY, 0], torso: [0, 0.04, 0], neck: [0, d.torso, 0],
    shoulderL: [d.shoulderX, shoulderY, 0], elbowL: [0, -d.upper, 0], handL: [0, -d.fore, 0],
    shoulderR: [-d.shoulderX, shoulderY, 0], elbowR: [0, -d.upper, 0], handR: [0, -d.fore, 0],
    hipL: [d.hipX, -0.02, 0], kneeL: [0, -d.thigh, 0], ankleL: [0, -d.shin, 0],
    hipR: [-d.hipX, -0.02, 0], kneeR: [0, -d.thigh, 0], ankleR: [0, -d.shin, 0],
  };
}

/**
 * Builds the joint tree and hangs each bone's merged parts on it: one
 * solid mesh and at most one glowing mesh per bone, so a whole fighter
 * is a couple of dozen draws.
 */
export function buildRig(spec: RigSpec, solid: THREE.Material, glow: THREE.Material): Rig {
  const root = new THREE.Group();
  root.name = "fighter";
  const joints = { root } as Joints;
  const at = offsets(spec.dims);
  for (const bone of BONES) {
    const g = new THREE.Group();
    g.name = bone;
    g.position.set(...at[bone]);
    joints[bone] = g;
    joints[PARENT[bone]].add(g);
  }
  const meshes: THREE.Mesh[] = [];
  const hang = (parts: Parts | undefined, mat: THREE.Material) => {
    for (const bone of BONES) {
      const list = parts?.[bone];
      if (!list?.length) continue;
      const mesh = new THREE.Mesh(merge(list), mat);
      joints[bone].add(mesh);
      meshes.push(mesh);
    }
  };
  hang(spec.solid, solid);
  hang(spec.glow, glow);
  return {
    joints,
    dims: spec.dims,
    meshes,
    dispose() {
      for (const mesh of meshes) mesh.geometry.dispose();
    },
  };
}

/** Collects parts bone by bone while a builder paints them. */
export class PartList {
  readonly solid: Parts = {};
  readonly glow: Parts = {};

  add(bone: Bone, ...geos: THREE.BufferGeometry[]): void {
    (this.solid[bone] ??= []).push(...geos);
  }

  lit(bone: Bone, ...geos: THREE.BufferGeometry[]): void {
    (this.glow[bone] ??= []).push(...geos);
  }
}
