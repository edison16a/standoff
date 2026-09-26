import * as THREE from "three";
import type { MeshBuilder } from "../../kit/mesh-builder";
import { boot, fist, limb, ARM, LEG, neck, onTorso, pelvis, torso } from "../model/anatomy";
import type { Dresser } from "../model/dresser";
import type { LookKit } from "../model/look-kit";
import { BODY } from "../rig/skeleton";
import { kneeCop, plume, splitSkirt } from "./parts";

const STEEL = 0xb4bdc8;
const DARK = 0x4f5967;
const GOLD = 0xc9a227;

/**
 * The Knight: full plate under a surcoat in the player's colour, with a
 * gold cross on the chest, layered pauldrons, elbow and knee cops,
 * gauntlets, sabatons, and a visored helm with a plume in the player's
 * colour.
 */
export function dressKnight(d: Dresser, kit: LookKit, trim: THREE.Color): void {
  const plate = kit.metal(STEEL, 0.42);
  const dark = kit.metal(DARK, 0.45);
  const gold = kit.metal(GOLD, 0.3);
  const coat = kit.cloth(trim.clone().multiplyScalar(0.8), 0.8);
  const mail = kit.metal(0x6b727c, 0.55);
  const leather = kit.leather(0x3a2616, 0.7);

  const chest = d.on("chest");
  torso(chest, plate, 1.12);
  // The surcoat over the breastplate, bordered in gold, with a gold cross.
  const surcoat: [number, number][] = [[0, -0.07], [0.152, -0.06], [0.152, 0.1], [0.164, 0.2], [0.18, 0.3], [0.182, 0.36], [0, 0.37]];
  chest.lathe(surcoat.map(([r, y]) => [r * 1.2, y] as [number, number]), coat, [0, 0, 0], [0.8, 1, 1.2], 28);
  chest.add(new THREE.TorusGeometry(0.182 * 1.2, 0.008, 6, 36), gold, [0, 0.36, 0], [Math.PI / 2, 0, 0], [0.8, 1.2, 1]);
  const at = onTorso(0.25, 0, 1.24, 0.012);
  chest.box(0.012, 0.19, 0.045, gold, at, [0, 0, 0], 0.004);
  chest.box(0.012, 0.045, 0.15, gold, [at[0], 0.28, 0], [0, 0, 0], 0.004);
  // Gorget round the throat, a sword belt with a buckle.
  chest.lathe([[0.1, 0.42], [0.098, 0.47], [0.075, 0.51], [0.07, 0.53]].reverse() as [number, number][], plate, [0, 0, 0], [0.9, 1, 1], 24);
  chest.cylinder(0.186, 0.186, 0.04, leather, [0, 0.05, 0], [0, 0, 0], 28, [0.82, 1, 1.22]);
  chest.box(0.014, 0.05, 0.06, gold, onTorso(0.05, 0, 1.4, 0.02), [0, 0, 0], 0.006);
  // Pauldrons: shells of plate over each shoulder, each lame overlapping the next down the arm, edged in gold.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const shell = new THREE.SphereGeometry(0.115 - i * 0.012, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
      chest.add(shell, plate, [0, 0.43 - i * 0.05, side * (0.2 + i * 0.022)], [side * (0.55 + i * 0.12), 0, 0], [1.05, 0.9, 1]);
    }
    chest.add(new THREE.TorusGeometry(0.083, 0.006, 6, 28), gold, [0, 0.37, side * 0.255], [Math.PI / 2 + side * 0.8, 0, 0], [1.05, 1, 1]);
    chest.sphere(0.01, gold, [0.06, 0.47, side * 0.2], [1, 1, 1], 6);
  }

  const hips = d.on("pelvis");
  pelvis(hips, mail, 1.1);
  // Faulds: bands of plate stepping out over the hips.
  for (let i = 0; i < 3; i++) hips.cylinder(0.165 + i * 0.012, 0.17 + i * 0.012, 0.045, plate, [0, -0.02 - i * 0.042, 0], [0, 0, 0], 28, [0.82, 1, 1.18]);
  splitSkirt(d, kit, coat, gold, 0.3);

  for (const side of ["R", "L"] as const) {
    const upper = d.on(`upperArm${side}`);
    limb(upper, BODY.upperArm, ARM.upper, mail, 1.1);
    for (let i = 0; i < 3; i++) upper.cylinder(0.066 - i * 0.003, 0.062 - i * 0.003, 0.055, plate, [0, -0.07 - i * 0.07, 0], [0, 0, 0], 18);
    kneeCop(upper, plate, -BODY.upperArm, 0.058, -1);
    const fore = d.on(`forearm${side}`);
    limb(fore, BODY.forearm, ARM.fore, mail, 1.1);
    fore.cylinder(0.056, 0.049, 0.16, plate, [0, -0.1, 0], [0, 0, 0], 18);
    fore.cylinder(0.066, 0.046, 0.08, plate, [0, -BODY.forearm + 0.035, 0], [0, 0, 0], 18);
    fist(d.on(`hand${side}`), plate, side === "R" ? 1 : -1, 1.12);
    d.on(`hand${side}`).box(0.07, 0.014, 0.07, gold, [0, 0.036, 0], [0, 0, 0], 0.004);

    const thigh = d.on(`thigh${side}`);
    limb(thigh, BODY.thigh, LEG.thigh, dark, 1.08);
    thigh.cylinder(0.098, 0.084, 0.28, plate, [0.004, -0.2, 0], [0, 0, 0], 18, [1.02, 1, 0.98]);
    kneeCop(thigh, plate, -BODY.thigh, 0.066, 1);
    const shin = d.on(`shin${side}`);
    limb(shin, BODY.shin, LEG.shin, dark, 1.08);
    shin.cylinder(0.068, 0.056, 0.34, plate, [0.006, -0.2, 0], [0, 0, 0], 18);
    const foot = d.on(`foot${side}`);
    boot(foot, dark, leather, 1.08);
    for (let i = 0; i < 3; i++) foot.box(0.05, 0.03, 0.1, plate, [0.07 + i * 0.045, -0.034 - i * 0.004, 0], [0, 0, -0.2], 0.012);
  }

  helm(d.on("head"), kit, plate, gold, trim);
}

function helm(b: MeshBuilder, kit: LookKit, plate: THREE.Material, gold: THREE.Material, trim: THREE.Color): void {
  const slit = kit.metal(0x0b0e14, 0.6, false);
  neck(b, kit.metal(0x6b727c, 0.55));
  // The bowl, rising to a gentle point, over a mail aventail.
  b.lathe([[0, 0.39], [0.03, 0.385], [0.082, 0.355], [0.114, 0.305], [0.127, 0.235], [0.128, 0.15], [0.122, 0.08], [0.11, 0.035], [0, 0.035]].reverse() as [number, number][], plate, [0, 0, 0], [1.06, 1, 0.97], 32);
  b.lathe([[0.158, -0.06], [0.142, -0.01], [0.12, 0.05], [0.104, 0.06]].reverse() as [number, number][], kit.metal(0x6b727c, 0.55), [0, 0, 0], [1, 1, 1], 24);
  // The visor juts forward like a hound's muzzle, ridged down the middle, eye slits above it.
  b.add(new THREE.ConeGeometry(0.108, 0.19, 28), plate, [0.15, 0.168, 0], [0, 0, -Math.PI / 2], [1, 1, 1.05]);
  b.sphere(0.108, plate, [0.05, 0.168, 0], [0.9, 1, 1.02], 24);
  b.rod([0.05, 0.275, 0], [0.24, 0.17, 0], 0.008, plate, 6);
  for (const z of [-1, 1]) b.box(0.05, 0.014, 0.068, slit, [0.135, 0.214, z * 0.05], [0, z * 0.45, -0.28], 0.005);
  for (let i = 0; i < 4; i++) {
    for (const z of [-1, 1]) b.sphere(0.0075, slit, [0.2 - i * 0.02, 0.142 - i * 0.004, z * (0.02 + i * 0.012)], [1, 1, 1], 6);
  }
  for (const z of [-1, 1]) b.sphere(0.021, gold, [0.0, 0.185, z * 0.124], [1, 1, 0.5], 12);
  plume(b, kit.cloth(trim, 0.9), 0.25);
}
