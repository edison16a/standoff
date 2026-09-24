import * as THREE from "three";
import type { Hand } from "../../engine/types";
import { buildForearm, buildGlove, buildUpperArm, FOREARM, UPPER_ARM } from "./arm";
import { buildHead, type HeadParts } from "./head";
import { ANKLE_HEIGHT, buildFoot, buildShin, buildThigh, SHIN, THIGH } from "./leg";
import type { Look } from "./looks";
import { BoxerMaterials } from "./materials";
import { buildBelly, buildChest, buildNeck, buildTrunks } from "./torso";

/** Where the joints sit on a boxer standing tall, in metres from the floor between the feet. */
export const BODY = {
  hipWidth: 0.1,
  hipDrop: 0.05,
  spine: 0.07,
  chest: 0.2,
  neck: { y: 0.32, z: -0.012 },
  head: 0.105,
  shoulder: { x: 0.2, y: 0.265 },
  standingHips: THIGH + SHIN + ANKLE_HEIGHT + 0.05,
} as const;

export interface Limb {
  /** The joint at the body: shoulder or hip. */
  root: THREE.Object3D;
  /** Elbow or knee. */
  middle: THREE.Object3D;
  /** Wrist, or the foot, which hangs from the model's root so it stays level. */
  end: THREE.Object3D;
  upper: number;
  lower: number;
}

/**
 * A boxer built from sculpted parts on a skeleton of plain joints. The
 * rig (rig/boxer-rig.ts) poses the joints every frame; this only builds
 * them and hangs the meshes on. The whole model faces +z with its left
 * hand at +x.
 */
export class BoxerModel {
  readonly root = new THREE.Group();
  readonly hips = new THREE.Group();
  readonly spine = new THREE.Group();
  readonly chest = new THREE.Group();
  readonly neck = new THREE.Group();
  readonly head = new THREE.Group();
  readonly arms: Record<Hand, Limb>;
  readonly legs: Record<Hand, Limb>;
  readonly face: HeadParts;
  readonly materials: BoxerMaterials;

  constructor(readonly look: Look) {
    const m = (this.materials = new BoxerMaterials(look));
    this.root.scale.setScalar(look.height);
    this.root.add(this.hips);
    this.hips.position.y = BODY.standingHips;
    this.hips.add(buildTrunks(m), this.spine);
    this.spine.position.y = BODY.spine;
    this.spine.add(buildBelly(m), this.chest);
    this.chest.position.y = BODY.chest;
    this.chest.add(buildChest(m), this.neck);
    this.neck.position.set(0, BODY.neck.y, BODY.neck.z);
    this.neck.add(buildNeck(m), this.head);
    this.head.position.set(0, BODY.head, 0.012);
    this.face = buildHead(m);
    this.head.add(this.face.group);
    this.arms = { left: this.arm(m, 1), right: this.arm(m, -1) };
    this.legs = { left: this.leg(m, 1), right: this.leg(m, -1) };
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }

  private arm(m: BoxerMaterials, side: 1 | -1): Limb {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * BODY.shoulder.x * m.look.bulk, BODY.shoulder.y, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -UPPER_ARM;
    const wrist = new THREE.Group();
    wrist.position.y = -FOREARM;
    shoulder.add(buildUpperArm(m, side), elbow);
    elbow.add(buildForearm(m), wrist);
    wrist.add(buildGlove(m, side));
    this.chest.add(shoulder);
    return { root: shoulder, middle: elbow, end: wrist, upper: UPPER_ARM, lower: FOREARM };
  }

  private leg(m: BoxerMaterials, side: 1 | -1): Limb {
    const hip = new THREE.Group();
    hip.position.set(side * BODY.hipWidth, -BODY.hipDrop, 0);
    const knee = new THREE.Group();
    knee.position.y = -THIGH;
    const foot = new THREE.Group();
    hip.add(buildThigh(m, side), knee);
    knee.add(buildShin(m));
    foot.add(buildFoot(m));
    this.hips.add(hip);
    this.root.add(foot);
    return { root: hip, middle: knee, end: foot, upper: THIGH, lower: SHIN };
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.materials.dispose();
  }
}
