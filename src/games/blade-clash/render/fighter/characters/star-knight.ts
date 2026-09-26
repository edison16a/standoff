import * as THREE from "three";
import type { MeshBuilder } from "../../kit/mesh-builder";
import { boot, fist, limb, ARM, LEG, neck, onTorso, pelvis, torso } from "../model/anatomy";
import type { Dresser } from "../model/dresser";
import type { LookKit } from "../model/look-kit";
import { BODY } from "../rig/skeleton";
import { kneeCop, splitSkirt } from "./parts";

const SHELL = 0xe9edf5;
const SUIT = 0x2a2f3c;
const COAT = 0x1b2130;

/**
 * The Star Knight, an original design: a duellist in a white shell of
 * armour over a dark suit, a long split coat, one broad shoulder plate
 * on the free side, and a smooth helmet with a glowing visor band. Lines
 * of light in the player's colour run over the armour, the same colour
 * as the energy blade.
 */
export function dressStarKnight(d: Dresser, kit: LookKit, trim: THREE.Color): void {
  const shell = kit.lacquer(SHELL, 0.28);
  const suit = kit.cloth(SUIT, 0.8);
  const coat = kit.cloth(COAT, 0.85);
  const light = kit.glow(trim, 2.2);
  const dark = kit.metal(0x3a4150, 0.35);

  const chest = d.on("chest");
  torso(chest, suit, 1.04);
  // The chest shell, a collar, and lines of light across it.
  chest.lathe([[0, 0.12], [0.15, 0.13], [0.165, 0.22], [0.18, 0.31], [0.176, 0.38], [0.14, 0.44], [0, 0.45]].reverse() as [number, number][], shell, [0, 0, 0], [0.8, 1, 1.18], 28);
  chest.lathe([[0.085, 0.44], [0.095, 0.5], [0.08, 0.54]].reverse() as [number, number][], shell, [0, 0, 0], [1, 1, 1], 20);
  for (const [y, a] of [[0.3, 0.5], [0.24, 0.62]] as const) {
    for (const side of [-1, 1]) chest.box(0.008, 0.012, 0.11, light, onTorso(y, side * a, 1.12, 0.012), [0, side * a, 0]);
  }
  chest.box(0.01, 0.1, 0.012, light, onTorso(0.2, 0, 1.1, 0.02), [0, 0, 0]);
  // The belt, with a glowing buckle.
  chest.cylinder(0.156, 0.156, 0.045, dark, [0, 0.03, 0], [0, 0, 0], 28, [0.82, 1, 1.2]);
  chest.cylinder(0.024, 0.024, 0.012, light, onTorso(0.03, 0, 1.2, 0.03), [0, 0, Math.PI / 2], 16);
  // A broad plate over the free shoulder, and a small one on the sword side.
  chest.sphere(0.12, shell, [-0.01, 0.43, -0.2], [1.1, 0.55, 1], 20);
  chest.box(0.12, 0.012, 0.012, light, [0.02, 0.475, -0.24], [0.4, 0, 0], 0.004);
  chest.sphere(0.08, shell, [0, 0.44, 0.2], [1, 0.5, 0.9], 16);

  const hips = d.on("pelvis");
  pelvis(hips, suit, 1.05);
  hips.cylinder(0.17, 0.2, 0.2, coat, [-0.02, -0.08, 0], [0, 0, 0], 24, [0.85, 1, 1.15]);
  splitSkirt(d, kit, coat, light, 0.46);

  for (const side of ["R", "L"] as const) {
    const upper = d.on(`upperArm${side}`);
    limb(upper, BODY.upperArm, ARM.upper, suit, 1.05);
    upper.cylinder(0.064, 0.058, 0.14, shell, [0, -0.1, 0], [0, 0, 0], 18);
    const fore = d.on(`forearm${side}`);
    limb(fore, BODY.forearm, ARM.fore, suit, 1.05);
    fore.cylinder(0.058, 0.048, 0.16, shell, [0, -0.17, 0], [0, 0, 0], 18);
    fore.box(0.012, 0.12, 0.012, light, [0.058, -0.17, 0], [0, 0, 0.05]);
    fist(d.on(`hand${side}`), kit.leather(0x14171f, 0.5), side === "R" ? 1 : -1, 1.05);

    const thigh = d.on(`thigh${side}`);
    limb(thigh, BODY.thigh, LEG.thigh, suit, 1.04);
    kneeCop(thigh, shell, -BODY.thigh, 0.064, 1);
    const shin = d.on(`shin${side}`);
    limb(shin, BODY.shin, LEG.shin, suit, 1.04);
    // Tall white boots up to the knee, with a line of light down the front.
    shin.cylinder(0.07, 0.058, 0.32, shell, [0.004, -0.27, 0], [0, 0, 0], 18);
    shin.box(0.008, 0.2, 0.012, light, [0.072, -0.24, 0], [0, 0, 0.04]);
    boot(d.on(`foot${side}`), shell, dark, 1.05);
  }

  helmet(d.on("head"), shell, dark, light);
}

function helmet(b: MeshBuilder, shell: THREE.Material, dark: THREE.Material, light: THREE.Material): void {
  neck(b, dark);
  // A smooth egg of a helmet with a raised ridge from the brow over the top.
  b.sphere(0.135, shell, [0.005, 0.2, 0], [1.05, 1.08, 0.98], 32);
  b.add(new THREE.TorusGeometry(0.14, 0.012, 8, 32, Math.PI * 0.9), shell, [0.0, 0.2, 0], [0, 0, Math.PI * 0.05]);
  // The dark faceplate below, and the visor band of light wrapping the front.
  b.sphere(0.112, dark, [0.05, 0.13, 0], [1, 0.8, 1.02], 24);
  b.add(new THREE.TorusGeometry(0.128, 0.017, 8, 32, Math.PI * 0.72), light, [0.012, 0.205, 0], [Math.PI / 2, 0, -Math.PI * 0.36], [1.05, 0.98, 1]);
  // Cheek vents and a fin on the free side.
  for (const z of [-1, 1]) {
    for (let i = 0; i < 3; i++) b.box(0.03, 0.006, 0.01, dark, [0.09 - i * 0.012, 0.1 - i * 0.012, z * 0.105], [0, 0, 0.5]);
  }
  b.box(0.1, 0.05, 0.01, shell, [-0.04, 0.26, -0.14], [0, 0.1, -0.3], 0.008);
}
