import * as THREE from "three";
import type { Kit, Look } from "../../looks";
import { sharedBodyGeometry } from "./body-geometry";
import { kitTexture } from "./kit-print";
import type { AthleteMaterials } from "./materials";
import { buildSkeleton, dimsOf, type Rig } from "./rig";

export type { Rig } from "./rig";

export interface BodySpec {
  look: Look;
  kit: Kit;
  name: string;
  number: number;
  /** Long sleeves, big gloves and the keeper's pattern. */
  keeper?: boolean;
}

/**
 * A footballer built for the broadcast: one continuous skinned body cut
 * to the look's height and build, a sculpted head with its own face,
 * hair and beard, hands with fingers or gloves, and the kit printed with
 * the player's name and number, over socks, shin pads and studded boots.
 * Everything one material draws is one skinned mesh, so a player costs
 * three draws: skin, kit and gear. The bones are the player's own; the
 * meshes are shared with every player of the same look.
 */
export function buildBody(spec: BodySpec, mats: AthleteMaterials): Rig {
  const { rig, bones } = buildSkeleton(dimsOf(spec.look), spec.look.height);
  const geo = sharedBodyGeometry(spec.look, spec.keeper === true, mats.fine);
  const print = kitTexture({ kit: spec.kit, name: spec.name, number: spec.number, keeper: spec.keeper === true }, mats.fine);
  const kitMaterial = mats.kit(print, spec.kit.shirt);
  const skeleton = new THREE.Skeleton(bones);
  for (const [g, m] of [[geo.skin, mats.skin], [geo.kit, kitMaterial], [geo.gear, mats.gear]] as const) {
    const mesh = new THREE.SkinnedMesh(g, m);
    mesh.castShadow = true;
    mesh.receiveShadow = mats.fine;
    // The body runs far from where it was bound, so it is never culled on a stale box.
    mesh.frustumCulled = false;
    rig.root.add(mesh);
    mesh.bind(skeleton, new THREE.Matrix4());
  }
  return {
    ...rig,
    // The geometry stays: other players of the same look share it.
    dispose() {
      skeleton.dispose();
      print.dispose();
      kitMaterial.dispose();
    },
  };
}
