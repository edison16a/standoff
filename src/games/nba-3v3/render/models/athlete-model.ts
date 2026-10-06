import * as THREE from "three";
import type { BuildSpec } from "../../builds";
import type { Team } from "../../roster";
import type { AthleteMaterials } from "../materials/athlete-materials";
import { kitTexture } from "./kit-texture";
import { buildRig, type Dims, type Extras, type Joints } from "./rig";
import { sharedGeometry } from "./athlete-geometry";

export type { Dims, Joints } from "./rig";
export { headOffset } from "./athlete-geometry";

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

/**
 * A player built for the broadcast: one continuous skinned body from
 * the build's height, width, bulk and reach, a sculpted head with the
 * build's face, hair and beard, hands with fingers, and the team's kit
 * with the player's number and name, over high top shoes and socks.
 * Everything one material draws merges into one skinned mesh, so a
 * player costs three draws: skin, kit and gear.
 */
export function buildAthlete(c: BuildSpec, team: Team, mats: AthleteMaterials, o: AthleteOptions = {}): AthleteModel {
  // Each player gets its own bones; the build's geometry is shared, bound the same way to any rig of the build.
  const rig = buildRig(c);
  const { skin, kit, gear } = sharedGeometry(c, mats.detail === "high", o.referee);
  const print = kitTexture({ team, number: c.number, name: o.backName ?? c.name, referee: o.referee });
  const kitMat = mats.kit(print, o.referee ? "#d4d4d4" : team.color);
  const skeleton = new THREE.Skeleton(rig.bones);
  const meshes: THREE.Mesh[] = [];
  for (const [geo, mat] of [[skin, mats.skin], [kit, kitMat], [gear, mats.gear]] as const) {
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
    // The geometry stays: other players of the build share it.
    dispose() {
      skeleton.dispose();
      print.dispose();
      kitMat.dispose();
    },
  };
}
