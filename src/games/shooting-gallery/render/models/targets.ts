import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BULLSEYE_CENTER_Y, BULLSEYE_RADIUS, PLATE_CENTER_Y, PLATE_RADIUS } from "../../engine/kinds";
import { bullseyeTexture, grainTexture } from "../textures";

/**
 * The two targets that are not ducks: a bullseye on a wooden stick that
 * pops up from behind the back wave, and a small steel plate that hangs
 * from a trolley on the top rail. Both are built around their hinge at
 * the origin, facing +z toward the players.
 */

interface Kit {
  face: THREE.BufferGeometry;
  rim: THREE.BufferGeometry;
  back: THREE.BufferGeometry;
  plateBack: THREE.BufferGeometry;
  stick: THREE.BufferGeometry;
  steel: THREE.BufferGeometry;
  plateFace: THREE.BufferGeometry;
  plateRim: THREE.BufferGeometry;
  trolley: THREE.BufferGeometry;
  faceMat: THREE.Material;
  plateMat: THREE.Material;
  rimMat: THREE.Material;
  backMat: THREE.Material;
  woodMat: THREE.Material;
  steelMat: THREE.Material;
}

/** A disc facing +z. Its front cap carries the rings, its sides the painted edge. */
function disc(radius: number, depth: number, centreY: number): THREE.BufferGeometry {
  const geometry = new THREE.CircleGeometry(radius, 64);
  // Just proud of the backing disc, so the two never fight over depth.
  geometry.translate(0, centreY, depth / 2 + 0.003);
  return geometry;
}

function build(): Kit {
  const r = BULLSEYE_RADIUS;
  const back = new THREE.CylinderGeometry(r, r * 0.98, 0.035, 64, 1);
  back.rotateX(Math.PI / 2);
  back.translate(0, BULLSEYE_CENTER_Y, 0);
  const rim = new THREE.TorusGeometry(r, 0.02, 12, 72);
  rim.translate(0, BULLSEYE_CENTER_Y, 0.012);

  // The stick, a clamp where it meets the face, and a pivot block at the hinge.
  const pole = new THREE.CylinderGeometry(0.024, 0.028, BULLSEYE_CENTER_Y - r + 0.1, 14);
  pole.translate(0, (BULLSEYE_CENTER_Y - r + 0.1) / 2, -0.03);
  const clamp = new THREE.BoxGeometry(0.09, 0.07, 0.03);
  clamp.translate(0, BULLSEYE_CENTER_Y - r + 0.02, -0.035);
  const pivot = new THREE.BoxGeometry(0.1, 0.08, 0.08);
  pivot.translate(0, 0.02, -0.03);
  const pin = new THREE.CylinderGeometry(0.02, 0.02, 0.16, 12);
  pin.rotateZ(Math.PI / 2);
  const steel = mergeGeometries([clamp, pivot, pin].map((g) => g.toNonIndexed()));

  const plateBack = new THREE.CylinderGeometry(PLATE_RADIUS, PLATE_RADIUS, 0.02, 48);
  plateBack.rotateX(Math.PI / 2);
  plateBack.translate(0, PLATE_CENTER_Y, 0);
  const plateRim = new THREE.TorusGeometry(PLATE_RADIUS, 0.012, 10, 48);
  plateRim.translate(0, PLATE_CENTER_Y, 0.008);

  // The trolley: two wheels riding on the rail, a hanger strap, and a hook down to the plate.
  const wheelA = new THREE.CylinderGeometry(0.03, 0.03, 0.022, 16);
  wheelA.rotateX(Math.PI / 2);
  wheelA.translate(-0.05, 0.055, 0);
  const wheelB = wheelA.clone().translate(0.1, 0, 0);
  const strap = new THREE.BoxGeometry(0.15, 0.03, 0.012);
  strap.translate(0, 0.055, 0.025);
  const hanger = new THREE.BoxGeometry(0.014, 0.1, 0.014);
  hanger.translate(0, -0.005, 0.02);
  const eye = new THREE.TorusGeometry(0.02, 0.006, 8, 16);
  eye.translate(0, PLATE_CENTER_Y + PLATE_RADIUS + 0.018, 0.02);
  const trolley = mergeGeometries([wheelA, wheelB, strap, hanger, eye].map((g) => g.toNonIndexed()));

  const wood = grainTexture(9);
  wood.rotation = Math.PI / 2;
  return {
    face: disc(r, 0.035, BULLSEYE_CENTER_Y),
    rim,
    back,
    plateBack,
    stick: pole,
    steel,
    plateFace: disc(PLATE_RADIUS, 0.02, PLATE_CENTER_Y),
    plateRim,
    trolley,
    faceMat: new THREE.MeshStandardMaterial({ map: bullseyeTexture(5), roughness: 0.55 }),
    plateMat: new THREE.MeshStandardMaterial({ map: bullseyeTexture(3), roughness: 0.35, metalness: 0.3 }),
    rimMat: new THREE.MeshStandardMaterial({ color: "#7a0d18", roughness: 0.4, metalness: 0.3 }),
    backMat: new THREE.MeshStandardMaterial({ color: "#e9dfcc", roughness: 0.7 }),
    woodMat: new THREE.MeshStandardMaterial({ color: "#8a5a32", map: wood, roughness: 0.7 }),
    steelMat: new THREE.MeshStandardMaterial({ color: "#9aa1a8", metalness: 0.9, roughness: 0.35 }),
  };
}

let kit: Kit | null = null;

function shared(): Kit {
  kit ??= build();
  return kit;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, shadow = true): THREE.Mesh {
  const made = new THREE.Mesh(geometry, material);
  made.castShadow = shadow;
  return made;
}

/** A red and white bullseye on its stick. */
export function createBullseye(): THREE.Group {
  const k = shared();
  const group = new THREE.Group();
  group.add(
    mesh(k.back, k.backMat),
    mesh(k.face, k.faceMat, false),
    mesh(k.rim, k.rimMat),
    mesh(k.stick, k.woodMat),
    mesh(k.steel, k.steelMat),
  );
  return group;
}

/** A small painted plate hanging from its rail trolley. */
export function createPlate(): THREE.Group {
  const k = shared();
  const group = new THREE.Group();
  group.add(mesh(k.plateBack, k.steelMat), mesh(k.plateFace, k.plateMat, false), mesh(k.plateRim, k.rimMat), mesh(k.trolley, k.steelMat));
  return group;
}
