import * as THREE from "three";
import type { BuildSpec } from "../../builds";

/** Every joint the animations turn. Each is a bone whose children hang from it. */
export interface Joints {
  root: THREE.Bone;
  hips: THREE.Bone;
  torso: THREE.Bone;
  neck: THREE.Bone;
  shoulderL: THREE.Bone;
  shoulderR: THREE.Bone;
  elbowL: THREE.Bone;
  elbowR: THREE.Bone;
  handL: THREE.Bone;
  handR: THREE.Bone;
  hipL: THREE.Bone;
  hipR: THREE.Bone;
  kneeL: THREE.Bone;
  kneeR: THREE.Bone;
  ankleL: THREE.Bone;
  ankleR: THREE.Bone;
}

/** Bones the poses never set: the shorts' legs, which sway after the thighs, and the rib cage, which breathes. */
export interface Extras {
  clothL: THREE.Bone;
  clothR: THREE.Bone;
  chest: THREE.Bone;
}

export type BoneName = keyof Joints | keyof Extras;

/** Lengths the animations need, in metres. */
export interface Dims {
  height: number;
  hipY: number;
  thigh: number;
  shin: number;
  upper: number;
  fore: number;
  torso: number;
  /** The shoe's sole in the ankle's frame: a hair over its underside, so it never flickers on the floor, and the heel and toe. */
  sole: { y: number; heel: number; toe: number };
}

/** The measurements the meshes are cut to. `s` is height over two metres; `width` and `bulk` come from the build. */
export interface Measures {
  s: number;
  width: number;
  bulk: number;
  ankle: number;
  shoe: number;
  shoulderX: number;
  hipX: number;
}

export interface Rig {
  joints: Joints;
  extras: Extras;
  dims: Dims;
  m: Measures;
  /** Every bone, in skinning order. */
  bones: THREE.Bone[];
  index(name: BoneName): number;
  /** Where a bone sits at rest, in the model's own space. No bone is turned at rest, so a bone's frame is its rest spot plus axes. */
  rest(name: BoneName): THREE.Vector3;
}

export const BONE_NAMES: readonly BoneName[] = [
  "root", "hips", "torso", "neck",
  "shoulderL", "elbowL", "handL", "shoulderR", "elbowR", "handR",
  "hipL", "kneeL", "ankleL", "hipR", "kneeR", "ankleR",
  "clothL", "clothR", "chest",
];

/**
 * The skeleton every player shares: pelvis, torso and neck, two arms
 * and legs of two segments each, plus the cloth and breathing bones.
 * Lengths come from the player's height and reach. At rest the arms
 * hang straight down and the legs stand straight, facing +z, with the
 * player's left on +x.
 */
export function buildRig(c: BuildSpec): Rig {
  const H = c.body.height;
  const { width, bulk, reach } = c.body;
  const ankle = 0.075;
  const shoe = 0.075 * H;
  const thigh = 0.245 * H;
  const shin = 0.232 * H;
  const hipY = thigh + shin + ankle;
  const torsoLen = 0.285 * H;
  const upper = 0.168 * H * reach;
  const fore = 0.148 * H * reach;
  const shoulderX = 0.1 * H * width;
  const hipX = 0.052 * H * width;

  const all = new Map<BoneName, THREE.Bone>();
  const bone = (name: BoneName, parent: THREE.Bone | null, at: [number, number, number] = [0, 0, 0]) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(...at);
    parent?.add(b);
    all.set(name, b);
    return b;
  };
  const root = bone("root", null);
  const hips = bone("hips", root, [0, hipY, 0]);
  const torso = bone("torso", hips, [0, 0.03 * H, 0]);
  const neck = bone("neck", torso, [0, torsoLen, 0]);
  const arm = (side: 1 | -1, k: "L" | "R") => {
    const shoulder = bone(`shoulder${k}`, torso, [side * shoulderX, torsoLen * 0.9, 0]);
    const elbow = bone(`elbow${k}`, shoulder, [0, -upper, 0]);
    return { shoulder, elbow, hand: bone(`hand${k}`, elbow, [0, -fore, 0]) };
  };
  const leg = (side: 1 | -1, k: "L" | "R") => {
    const hip = bone(`hip${k}`, hips, [side * hipX, 0, 0]);
    const knee = bone(`knee${k}`, hip, [0, -thigh, 0]);
    return { hip, knee, ankle: bone(`ankle${k}`, knee, [0, -shin, 0]) };
  };
  const [aL, aR, lL, lR] = [arm(1, "L"), arm(-1, "R"), leg(1, "L"), leg(-1, "R")];
  const extras: Extras = {
    clothL: bone("clothL", hips, [hipX, 0, 0]),
    clothR: bone("clothR", hips, [-hipX, 0, 0]),
    chest: bone("chest", torso, [0, torsoLen * 0.62, 0.02 * H]),
  };
  root.updateMatrixWorld(true);

  const bones = BONE_NAMES.map((n) => all.get(n)!);
  const rests = new Map(BONE_NAMES.map((n) => [n, all.get(n)!.getWorldPosition(new THREE.Vector3())] as const));
  return {
    joints: {
      root, hips, torso, neck,
      shoulderL: aL.shoulder, shoulderR: aR.shoulder, elbowL: aL.elbow, elbowR: aR.elbow, handL: aL.hand, handR: aR.hand,
      hipL: lL.hip, hipR: lR.hip, kneeL: lL.knee, kneeR: lR.knee, ankleL: lL.ankle, ankleR: lR.ankle,
    },
    extras,
    dims: { height: H, hipY, thigh, shin, upper, fore, torso: torsoLen, sole: { y: -ankle, heel: -0.525 * shoe, toe: 1.425 * shoe } },
    m: { s: H / 2, width, bulk, ankle, shoe, shoulderX, hipX },
    bones,
    index: (name) => BONE_NAMES.indexOf(name),
    rest: (name) => rests.get(name)!.clone(),
  };
}
