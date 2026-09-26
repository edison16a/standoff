import * as THREE from "three";
import type { MeshBuilder, V3 } from "../../kit/mesh-builder";
import type { Dresser } from "../model/dresser";
import type { LookKit } from "../model/look-kit";
import { BODY } from "../rig/skeleton";
import { blockEmblem, blockFace } from "./pixel-textures";

const SKIN = 0xf0b489;
const STEEL = 0x9aa3ad;
const TROUSERS = 0x3b3552;
const BOOTS = 0x6b4226;

/** A flat picture on one face of a cube, facing +x. */
function decal(b: MeshBuilder, material: THREE.Material, size: number, at: V3): void {
  b.add(new THREE.PlaneGeometry(size, size), material, at, [0, Math.PI / 2, 0]);
}

/**
 * The Block Hero: an original warrior built entirely from cubes, in a
 * tunic of the player's colour with a gold shield emblem, a steel helmet
 * open at the face, a stack of plume cubes, steel bracers and chunky
 * boots. The face is pixel art: bold brows, big eyes and war paint in
 * the player's colour.
 */
export function dressBlockHero(d: Dresser, kit: LookKit, trim: THREE.Color): void {
  const tunic = kit.matte(trim.clone().multiplyScalar(0.85));
  const skin = kit.matte(SKIN);
  const steel = kit.matte(STEEL, 0.45);
  const trousers = kit.matte(TROUSERS);
  const boots = kit.matte(BOOTS);
  const belt = kit.matte(0x5a3a1c);
  const gold = kit.matte(0xffc83d, 0.5);

  const chest = d.on("chest");
  chest.box(0.25, 0.44, 0.4, tunic, [0, 0.27, 0]);
  chest.box(0.26, 0.07, 0.41, belt, [0, 0.07, 0]);
  chest.box(0.03, 0.06, 0.06, gold, [0.13, 0.07, 0]);
  decal(chest, kit.adopt(new THREE.MeshStandardMaterial({ map: blockEmblem(), transparent: true, alphaTest: 0.5, roughness: 0.7 })), 0.2, [0.127, 0.3, 0]);
  // Square shoulder guards.
  for (const side of [-1, 1]) chest.box(0.17, 0.07, 0.14, steel, [0, 0.47, side * 0.21]);

  d.on("pelvis").box(0.22, 0.16, 0.38, trousers, [0, -0.05, 0]);

  for (const side of ["R", "L"] as const) {
    d.on(`upperArm${side}`).box(0.12, BODY.upperArm + 0.02, 0.12, tunic, [0, -BODY.upperArm / 2 + 0.01, 0]);
    const fore = d.on(`forearm${side}`);
    fore.box(0.11, BODY.forearm, 0.11, skin, [0, -BODY.forearm / 2, 0]);
    fore.box(0.125, BODY.forearm * 0.5, 0.125, steel, [0, -BODY.forearm * 0.7, 0]);
    d.on(`hand${side}`).box(0.1, 0.1, 0.1, skin, [0, 0, 0]);
    d.on(`thigh${side}`).box(0.15, BODY.thigh + 0.02, 0.15, trousers, [0, -BODY.thigh / 2, 0]);
    const shin = d.on(`shin${side}`);
    shin.box(0.14, BODY.shin * 0.5, 0.14, trousers, [0, -BODY.shin * 0.25, 0]);
    shin.box(0.155, BODY.shin * 0.52, 0.155, boots, [0, -BODY.shin * 0.74, 0]);
    d.on(`foot${side}`).box(0.26, 0.09, 0.15, boots, [0.06, -BODY.ankle + 0.045, 0]);
  }

  const head = d.on("head");
  head.box(0.1, 0.1, 0.1, skin, [0, 0.03, 0]);
  head.box(0.27, 0.27, 0.27, skin, [0, 0.2, 0]);
  decal(head, kit.adopt(new THREE.MeshStandardMaterial({ map: blockFace(`#${trim.getHexString()}`), roughness: 0.7 })), 0.27, [0.1355, 0.2, 0]);
  // The helmet: a steel shell over the top, back and sides, open at the face.
  head.box(0.31, 0.07, 0.31, steel, [0, 0.36, 0]);
  head.box(0.06, 0.3, 0.31, steel, [-0.13, 0.22, 0]);
  for (const side of [-1, 1]) head.box(0.26, 0.2, 0.03, steel, [-0.02, 0.26, side * 0.15]);
  head.box(0.04, 0.03, 0.31, steel, [0.14, 0.32, 0]);
  // Plume cubes stepping up and back, in the player's colour.
  const plume = kit.matte(trim);
  for (const [x, y, s] of [[0.04, 0.43, 0.08], [0.0, 0.5, 0.08], [-0.06, 0.53, 0.07], [-0.13, 0.5, 0.06]] as const) head.box(s, s, s, plume, [x, y, 0]);
}
