import * as THREE from "three";
import type { AthleteMaterials } from "../materials/athlete-materials";
import { DETAIL } from "../materials/athlete-materials";
import { arm, sleeve } from "./arms";
import { cleat } from "./cleats";
import { shade } from "./geo";
import { glove } from "./gloves";
import { face, neck } from "./head";
import { printJersey } from "./jersey-print";
import type { KitSpec } from "./kit";
import { leg, pelvis } from "./legs";
import { dress, groups, ramp, weigh, type Weights } from "./parts";
import { buildBones, dimsFor, type Bones, type Dims } from "./rig";
import { neckRadius, torso } from "./torso";

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
  dispose(): void;
}

/**
 * Builds a football player as one skinned body: skin, gear and the
 * printed jersey are three materials on one mesh, bent by the bones, so
 * elbows and knees fold smoothly with no gaps. The helmet, its mask and
 * visor ride on the neck bone. Shapes come from the player's height and
 * build; the shared shell, masks and materials come from `materials`.
 */
export function buildBody(kit: KitSpec, materials: AthleteMaterials): Rig {
  const detail = DETAIL[materials.detail].mesh;
  const d = dimsFor(kit.height, kit.build);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const { bones, list } = buildBones(d, body);

  const skin = [arm(d, kit, 1, detail), arm(d, kit, -1, detail), neck(d, kit, detail), face(d, kit, detail)];
  const gear = [
    pelvis(d, kit, detail), leg(d, kit, 1, detail), leg(d, kit, -1, detail),
    cleat(d, kit, 1, detail), cleat(d, kit, -1, detail), glove(d, kit, 1, detail), glove(d, kit, -1, detail),
  ];
  if (kit.towel) gear.push(towel(d));
  if (kit.neckRoll) gear.push(neckRoll(d, kit, detail));
  const jersey = [torso(d, detail), sleeve(d, kit, 1, detail), sleeve(d, kit, -1, detail)];
  const geometry = groups([skin, gear, jersey]);
  const print = printJersey(kit, d, kit.team, DETAIL[materials.detail].print);
  const shirt = materials.jersey(print, kit.jersey);
  const mesh = new THREE.SkinnedMesh(geometry, [materials.skin, materials.gear, shirt]);
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
  const shell = new THREE.Mesh(materials.shell(), materials.helmet(kit.team));
  shell.castShadow = true;
  const mask = new THREE.Mesh(materials.faceMask(kit.team, kit.look), materials.mask);
  mask.castShadow = true;
  head.add(shell, mask);
  if (kit.look.visor) head.add(new THREE.Mesh(materials.visorShape(), materials.visor(kit.look.visor)));

  return {
    ...bones, root, body, dims: d, hipHeight: d.hipY, legLength: d.thigh + d.shin, mesh,
    dispose() {
      geometry.dispose();
      shirt.dispose();
      print.dispose();
      mesh.skeleton.dispose();
    },
  };
}

/** A towel tucked in the front of the waistband, swinging a little with the left leg. */
function towel(d: Dims): THREE.BufferGeometry {
  const H = d.height;
  const W = 1 + 0.2 * d.build;
  const g = dress(new THREE.BoxGeometry(0.075, 0.17, 0.006, 1, 5, 1), { colour: "#f7f7f5", rough: 0.95 }, {
    at: [0.05 * H, 0.598 * H - 0.085, 0.073 * H * W + 0.004], rot: [0.08, 0, 0.05],
  });
  return weigh(g, (p): Weights => {
    const swing = 0.45 * ramp(0.598 * H, 0.598 * H - 0.17, p.y);
    return [["hips", 1 - swing], ["hipL", swing]];
  });
}

/** A thick collar sitting on the pads behind the neck, as hitters wear. */
function neckRoll(d: Dims, kit: KitSpec, detail: number): THREE.BufferGeometry {
  const H = d.height;
  const r = neckRadius(d) + 0.02 * H;
  const g = dress(new THREE.TorusGeometry(r, 0.017 * H, Math.round(10 * detail), Math.round(24 * detail), Math.PI * 1.15), { colour: shade(kit.jersey, -0.3), rough: 0.8 }, {
    at: [0, 0.842 * H, -0.006 * H], rot: [Math.PI / 2, 0, Math.PI * 0.925],
  });
  return weigh(g, () => [["spine", 1]]);
}
