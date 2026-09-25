import * as THREE from "three";
import type { CharacterId } from "../roster";
import type { TrailAnchor } from "./anim/strike";
import { STAFF_GEM } from "./models/mage";
import type { Rig } from "./models/rig";
import { KATANA } from "./models/samurai";

export type Anchor = Exclude<TrailAnchor, "none">;

/**
 * The points on a fighter that lead a move: a fist, a foot, the katana's
 * tip or the staff's gem. Trails follow them and a charge gathers on them.
 */
export class Anchors {
  private readonly at: Record<Anchor, [THREE.Object3D, THREE.Vector3]>;

  constructor(character: CharacterId, rig: Rig) {
    const j = rig.joints;
    const tip =
      character === "samurai" ? new THREE.Vector3(0, -0.04, KATANA.tip + 0.1) : character === "mage" ? new THREE.Vector3(0, STAFF_GEM.y, 0.02) : new THREE.Vector3(0, -0.08, 0);
    this.at = {
      handR: [j.handR, new THREE.Vector3(0, -0.08, 0)],
      handL: [j.handL, new THREE.Vector3(0, -0.08, 0)],
      ankleR: [j.ankleR, new THREE.Vector3(0, -0.04, 0.16)],
      ankleL: [j.ankleL, new THREE.Vector3(0, -0.04, 0.16)],
      tip: [j.handR, tip],
    };
  }

  /** Where an anchor is in the world now. The rig's matrices must be up to date. */
  world(anchor: Anchor, out: THREE.Vector3): THREE.Vector3 {
    const [bone, offset] = this.at[anchor];
    return bone.localToWorld(out.copy(offset));
  }
}
