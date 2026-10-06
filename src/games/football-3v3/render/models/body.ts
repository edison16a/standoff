import * as THREE from "three";
import type { AthleteMaterials } from "../materials/athlete-materials";
import { DETAIL } from "../materials/athlete-materials";
import type { AthleteShapes, Lod } from "./athlete-shapes";
import { printJersey } from "./jersey-print";
import type { KitSpec } from "./kit";
import { buildBones, dimsFor, type Bones, type Dims } from "./rig";

/** The joints the animations turn. Every limb segment hangs down its joint's -y. */
export interface Rig extends Bones {
  root: THREE.Group;
  /** Lifts, tips and rolls the whole body, for stances, dives and tackles. */
  body: THREE.Group;
  dims: Dims;
  /** Hip height standing, in metres. */
  hipHeight: number;
  /** Thigh plus shin, for matching the stride to the ground speed. */
  legLength: number;
  /** The skinned body, for counting what a frame draws. */
  mesh: THREE.SkinnedMesh;
  /** Swaps the body and helmet between the full shapes and the lighter far ones. */
  setLod(lod: Lod): void;
  dispose(): void;
}

/** Everything players are dressed from, shared across a renderer. */
export interface Wardrobe {
  materials: AthleteMaterials;
  shapes: AthleteShapes;
}

/**
 * Builds a football player as one skinned body: skin, gear and the
 * printed jersey are three materials on one mesh, bent by the bones, so
 * elbows and knees fold smoothly with no gaps. The helmet, its mask and
 * visor ride on the neck bone. The shapes are shared from the wardrobe;
 * only the jersey's print is the player's own.
 */
export function buildBody(kit: KitSpec, wardrobe: Wardrobe): Rig {
  const { materials, shapes } = wardrobe;
  const d = dimsFor(kit.height, kit.build);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const { bones, list } = buildBones(d, body);
  const print = printJersey(kit, d, kit.team, DETAIL[materials.detail].print);
  const shirt = materials.jersey(print, kit.jersey);
  const mesh = new THREE.SkinnedMesh(shapes.body(kit, "near"), [materials.skin, materials.gear, shirt]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // A sphere big enough for any pose, so culling never has to measure the bent body.
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, d.hipY, 0), d.height * 1.3);
  body.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(list));

  // The helmet rides the neck bone at the middle of the head.
  const head = new THREE.Group();
  head.position.set(0, d.head, 0);
  head.scale.setScalar(d.headScale);
  bones.neck.add(head);
  const shell = new THREE.Mesh(shapes.shell("near"), materials.helmet(kit.team));
  shell.castShadow = true;
  const mask = new THREE.Mesh(shapes.mask(kit.team, kit.look, "near"), materials.mask);
  mask.castShadow = true;
  head.add(shell, mask);
  if (kit.look.visor) head.add(new THREE.Mesh(shapes.visor(), materials.visor(kit.look.visor)));

  let shown: Lod = "near";
  return {
    ...bones, root, body, dims: d, hipHeight: d.hipY, legLength: d.thigh + d.shin, mesh,
    setLod(lod) {
      if (lod === shown) return;
      shown = lod;
      mesh.geometry = shapes.body(kit, lod);
      shell.geometry = shapes.shell(lod);
      mask.geometry = shapes.mask(kit.team, kit.look, lod);
    },
    dispose() {
      shirt.dispose();
      print.dispose();
      mesh.skeleton.dispose();
    },
  };
}
