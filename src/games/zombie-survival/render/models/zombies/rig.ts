import * as THREE from "three";
import { MeshBuilder, type V3 } from "../../mesh-builder";
import type { HitPart } from "../../../engine/zombie-kinds";
import { glowTexture } from "../../textures";
import { zombieMaterials } from "./zombie-materials";

/** Body proportions in metres. Every zombie and boss is this skeleton with different numbers. */
export interface BodyDims {
  thigh: number;
  shin: number;
  /** Ankle height above the ground. */
  foot: number;
  torso: number;
  torsoW: number;
  torsoD: number;
  shoulderW: number;
  hipW: number;
  upperArm: number;
  forearm: number;
  hand: number;
  neck: number;
  head: number;
  /** Thickness of the arms and legs. */
  arm: number;
  leg: number;
}

export const BONES = [
  "hips", "spine", "neck", "head", "jaw",
  "shoulderL", "elbowL", "handL", "shoulderR", "elbowR", "handR",
  "hipL", "kneeL", "ankleL", "hipR", "kneeR", "ankleR",
] as const;
export type Bone = (typeof BONES)[number];

/**
 * A zombie's skeleton: plain groups at each joint, so animation is just
 * turning joints. The model faces +z. Its left side is +x. `body` is the
 * pivot at the feet that tips the whole figure over when it falls.
 */
export interface Rig {
  root: THREE.Group;
  body: THREE.Group;
  bones: Record<Bone, THREE.Group>;
  dims: BodyDims;
  /** Invisible hit shapes, one per body part, for the raycast. */
  proxies: THREE.Mesh[];
  /** The glints in its eyes, which go out when it dies. */
  eyes: THREE.Sprite[];
}

export function makeRig(d: BodyDims): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const g = (parent: THREE.Object3D, x: number, y: number, z: number) => {
    const joint = new THREE.Group();
    joint.position.set(x, y, z);
    parent.add(joint);
    return joint;
  };
  const hips = g(body, 0, d.thigh + d.shin + d.foot, 0);
  const spine = g(hips, 0, 0.05, 0);
  const neck = g(spine, 0, d.torso, 0);
  const head = g(neck, 0, d.neck, 0);
  const jaw = g(head, 0, d.head * 0.12, d.head * 0.2);
  const arm = (side: 1 | -1) => {
    const shoulder = g(spine, (side * d.shoulderW) / 2, d.torso - d.arm * 0.6, 0);
    const elbow = g(shoulder, 0, -d.upperArm, 0);
    const hand = g(elbow, 0, -d.forearm, 0);
    return [shoulder, elbow, hand] as const;
  };
  const leg = (side: 1 | -1) => {
    const hip = g(hips, (side * d.hipW) / 2, -0.03, 0);
    const knee = g(hip, 0, -d.thigh, 0);
    const ankle = g(knee, 0, -d.shin, 0);
    return [hip, knee, ankle] as const;
  };
  const [shoulderL, elbowL, handL] = arm(1);
  const [shoulderR, elbowR, handR] = arm(-1);
  const [hipL, kneeL, ankleL] = leg(1);
  const [hipR, kneeR, ankleR] = leg(-1);
  const bones = { hips, spine, neck, head, jaw, shoulderL, elbowL, handL, shoulderR, elbowR, handR, hipL, kneeL, ankleL, hipR, kneeR, ankleR };
  for (const [name, bone] of Object.entries(bones)) bone.name = name;
  return { root, body, bones, dims: d, proxies: [], eyes: [] };
}

let eyeGlow: THREE.SpriteMaterial | null = null;

/** One material for every zombie's eye glints, so a crowd of them costs no more than one. */
function eyeMaterial(): THREE.SpriteMaterial {
  eyeGlow ??= new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd98a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0.9 });
  return eyeGlow;
}

/**
 * Collects each bone's parts, then merges them per bone, so a whole
 * zombie draws in a few dozen calls however much detail it carries.
 */
export class Dresser {
  private readonly builders = new Map<Bone, MeshBuilder>();

  constructor(private readonly rig: Rig) {}

  on(bone: Bone): MeshBuilder {
    let builder = this.builders.get(bone);
    if (!builder) {
      builder = new MeshBuilder();
      this.builders.set(bone, builder);
    }
    return builder;
  }

  /** An invisible box the raycast can hit, standing for one body part. */
  proxy(bone: Bone, size: V3, at: V3, part: HitPart, weak: number | null = null): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), zombieMaterials().proxy);
    mesh.position.set(...at);
    mesh.userData = { part, weak };
    mesh.visible = false;
    this.rig.bones[bone].add(mesh);
    this.rig.proxies.push(mesh);
    return mesh;
  }

  /**
   * A glint on an eye: a small glow that ignores the fog, so a pair of
   * eyes shows in the murk before the body does. Its material is shared
   * and marked so, and must not be disposed with the zombie.
   */
  eye(bone: Bone, at: V3, size: number): void {
    const sprite = new THREE.Sprite(eyeMaterial());
    sprite.userData.shared = true;
    sprite.position.set(...at);
    sprite.scale.setScalar(size);
    this.rig.bones[bone].add(sprite);
    this.rig.eyes.push(sprite);
  }

  finish(): void {
    for (const [bone, builder] of this.builders) {
      if (builder.empty) continue;
      const group = builder.build(`${bone}-skin`);
      for (const child of group.children) child.userData.visual = true;
      this.rig.bones[bone].add(group);
    }
    this.builders.clear();
  }
}

/** The standard hit boxes for a humanoid: head, chest, hips, arms and legs. */
export function standardProxies(dress: Dresser, d: BodyDims, pad = 1.15): void {
  const p = (v: number) => v * pad;
  dress.proxy("head", [p(d.head * 0.95), p(d.head * 1.05), p(d.head)], [0, d.head * 0.5, 0.01], "head");
  dress.proxy("spine", [p(d.torsoW), d.torso, p(d.torsoD)], [0, d.torso / 2, 0], "body");
  dress.proxy("hips", [p(d.torsoW * 0.9), 0.24, p(d.torsoD)], [0, -0.04, 0], "body");
  for (const s of ["L", "R"] as const) {
    dress.proxy(`shoulder${s}`, [p(d.arm), d.upperArm, p(d.arm)], [0, -d.upperArm / 2, 0], "limb");
    dress.proxy(`elbow${s}`, [p(d.arm), d.forearm + d.hand, p(d.arm)], [0, -(d.forearm + d.hand) / 2, 0], "limb");
    dress.proxy(`hip${s}`, [p(d.leg), d.thigh, p(d.leg)], [0, -d.thigh / 2, 0], "limb");
    dress.proxy(`knee${s}`, [p(d.leg), d.shin + d.foot, p(d.leg)], [0, -(d.shin + d.foot) / 2, 0.02], "limb");
  }
}
