import * as THREE from "three";
import type { BuildSpec } from "../../builds";
import type { Team } from "../../roster";
import type { AthleteMaterials } from "../materials/athlete-materials";
import { buildHand } from "./hands";
import { addGear } from "./gear";
import { buildHead } from "./head";
import { addKit } from "./kit";
import { kitTexture } from "./kit-texture";
import { limbs } from "./limbs";
import { PartList, tint } from "./parts";
import { buildRig, type Dims, type Extras, type Joints } from "./rig";
import { neckInfluence, neckTube, torsoInfluence, torsoTube } from "./torso";

export type { Dims, Joints } from "./rig";

export interface AthleteModel {
  joints: Joints;
  /** The shorts' sway bones and the breathing rib cage, which the view drives. */
  extras: Extras;
  dims: Dims;
  meshes: THREE.Mesh[];
  dispose(): void;
}

export interface AthleteOptions {
  /** The name across the back; the build's own by default. */
  backName?: string;
  /** Stripes and trousers instead of a team's kit. */
  referee?: boolean;
}

/** Where the head's centre sits over the neck joint: high enough for a real neck, a little forward of it. */
export function headOffset(s: number, k: number): THREE.Vector3 {
  return new THREE.Vector3(0, 0.074 * s + 0.106 * k, 0.014 * s);
}

/**
 * A player built for the broadcast: one continuous skinned body from
 * the build's height, width, bulk and reach, a sculpted head with the
 * build's face, hair and beard, hands with fingers, and the team's kit
 * with the player's number and name, over high top shoes and socks.
 * Everything one material draws merges into one skinned mesh, so a
 * player costs three draws: skin, kit and gear.
 */
export function buildAthlete(c: BuildSpec, team: Team, mats: AthleteMaterials, o: AthleteOptions = {}): AthleteModel {
  const rig = buildRig(c);
  const fine = mats.detail === "high";
  const { s, bulk } = rig.m;
  const look = c.look;

  const skin = new PartList(rig);
  for (const limb of limbs(rig, fine ? 22 : 12)) skin.weighted(tint(limb.geo, look.skin), limb.weigh, 0.42);
  skin.weighted(tint(torsoTube(rig, { n: fine ? 36 : 18, from: -0.1 * s, capStart: 0.03 * s, capEnd: 0.02 * s }), look.skin), torsoInfluence(rig), 0.44);
  skin.weighted(tint(neckTube(rig, fine ? 20 : 12), look.skin), neckInfluence(rig), 0.44);
  const headScale = 1 + (c.body.height - 2) * 0.12;
  const head = buildHead(look, headScale, fine);
  const at = headOffset(s, headScale);
  skin.rigid(head.skin.translate(at.x, at.y, at.z), "neck");
  for (const side of [1, -1] as const) skin.rigid(buildHand(look, side, s * (0.97 + 0.03 * bulk), fine), side > 0 ? "handL" : "handR");

  const kit = new PartList(rig);
  addKit(kit, rig, { referee: o.referee, fine });
  const gear = new PartList(rig);
  addGear(gear, rig, look, fine);
  gear.rigid(head.gear.translate(at.x, at.y, at.z), "neck");

  const print = kitTexture({ team, number: c.number, name: o.backName ?? c.name, referee: o.referee });
  const kitMat = mats.kit(print, o.referee ? "#d4d4d4" : team.color);
  const skeleton = new THREE.Skeleton(rig.bones);
  const meshes: THREE.Mesh[] = [];
  for (const [list, mat] of [[skin, mats.skin], [kit, kitMat], [gear, mats.gear]] as const) {
    const geo = list.geometry();
    if (!geo) continue;
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.castShadow = true;
    // The body moves far from where it was bound, so it is never culled on a stale box.
    mesh.frustumCulled = false;
    rig.joints.root.add(mesh);
    mesh.bind(skeleton);
    meshes.push(mesh);
  }

  return {
    joints: rig.joints,
    extras: rig.extras,
    dims: rig.dims,
    meshes,
    dispose() {
      for (const mesh of meshes) mesh.geometry.dispose();
      skeleton.dispose();
      print.dispose();
      kitMat.dispose();
    },
  };
}
