import * as THREE from "three";
import type { Kit, Look } from "../../looks";
import { sharedBodyGeometry, type BodyGeometry } from "./body-geometry";
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

/** A body's joints, and the choice of how finely it is drawn. */
export interface Body extends Rig {
  /** Close ups draw the fine meshes; the broadcast view the lighter ones. */
  setFine(fine: boolean): void;
}

/**
 * A footballer built for the broadcast: one continuous skinned body cut
 * to the look's height and build, a sculpted head with its own face,
 * hair and beard, hands with fingers or gloves, and the kit printed with
 * the player's name and number, over socks, shin pads and studded boots.
 * Everything one material draws is one skinned mesh, so a player costs
 * three draws: skin, kit and gear. The bones are the player's own; the
 * meshes are shared with every player of the same look.
 *
 * On a real graphics card each body comes in two cuts on the same bones:
 * a fine one for close ups and a lighter one for the wide view. The
 * lighter one always casts the shadow, and while the fine one is shown
 * it draws nothing else, so the shadow pass never pays for the fine cut.
 */
export function buildBody(spec: BodySpec, mats: AthleteMaterials): Body {
  const { rig, bones } = buildSkeleton(dimsOf(spec.look), spec.look.height);
  const keeper = spec.keeper === true;
  const print = kitTexture({ kit: spec.kit, name: spec.name, number: spec.number, keeper }, mats.fine);
  const kitMaterial = mats.kit(print, spec.kit.shirt);
  const skeleton = new THREE.Skeleton(bones);
  const materials: THREE.Material[] = [mats.skin, kitMaterial, mats.gear];
  const meshes = (geo: BodyGeometry, shadow: boolean) =>
    [geo.skin, geo.kit, geo.gear].map((g, i) => {
      const mesh = new THREE.SkinnedMesh<THREE.BufferGeometry, THREE.Material>(g, materials[i]);
      mesh.castShadow = shadow;
      mesh.receiveShadow = mats.fine;
      // The body runs far from where it was bound, so it is never culled on a stale box.
      mesh.frustumCulled = false;
      rig.root.add(mesh);
      mesh.bind(skeleton, new THREE.Matrix4());
      return mesh;
    });
  const broad = meshes(sharedBodyGeometry(spec.look, keeper, false), true);
  const fine = mats.fine ? meshes(sharedBodyGeometry(spec.look, keeper, true), false) : [];
  let shown = false;
  const setFine = (on: boolean) => {
    const want = on && fine.length > 0;
    if (want === shown) return;
    shown = want;
    for (const m of fine) m.visible = want;
    broad.forEach((m, i) => (m.material = want ? mats.shadowOnly : materials[i]!));
  };
  for (const m of fine) m.visible = false;
  return {
    ...rig,
    setFine,
    // The geometry stays: other players of the same look share it.
    dispose() {
      skeleton.dispose();
      print.dispose();
      kitMaterial.dispose();
    },
  };
}
