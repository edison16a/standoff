import * as THREE from "three";
import type { MeshBuilder } from "../../kit/mesh-builder";
import { boot, fist, limb, ARM, LEG, neck, pelvis, torso } from "../model/anatomy";
import type { Dresser } from "../model/dresser";
import type { LookKit } from "../model/look-kit";
import { BODY } from "../rig/skeleton";
import { lamellar } from "./samurai-parts";

const LACQUER = 0x16161b;
const GOLD = 0xd4a93a;
const INDIGO = 0x232842;

/**
 * The Samurai: black lacquered armour laced in the player's colour. A
 * cuirass of laced bands, broad shoulder plates, a skirt of plates over
 * wide trousers, shin guards, and a crested helmet with a flaring neck
 * guard over a red face mask.
 */
export function dressSamurai(d: Dresser, kit: LookKit, trim: THREE.Color): void {
  const black = kit.lacquer(LACQUER, 0.24);
  const lace = kit.cloth(trim.clone().multiplyScalar(0.75), 0.7);
  const gold = kit.metal(GOLD, 0.28);
  const hakama = kit.cloth(INDIGO, 0.9);
  const under = kit.cloth(0x2e2a33, 0.9);

  const chest = d.on("chest");
  torso(chest, under, 1.06);
  // The cuirass: lacquered bands stepping down the body, each tied with the player's colour.
  for (let i = 0; i < 6; i++) {
    const y = 0.06 + i * 0.058;
    const r = [0.15, 0.148, 0.152, 0.16, 0.168, 0.168][i]!;
    chest.cylinder(r * 1.03, r, 0.042, black, [0, y + 0.005, 0], [0, 0, 0], 28, [0.84, 1, 1.2]);
    chest.cylinder(r * 1.012, r * 1.012, 0.014, lace, [0, y - 0.022, 0], [0, 0, 0], 28, [0.84, 1, 1.2]);
  }
  // The breast plate, with a gold crest at its top, and the shoulder straps.
  chest.box(0.03, 0.08, 0.26, black, [0.12, 0.41, 0], [0, 0, 0.12], 0.012);
  chest.sphere(0.018, gold, [0.145, 0.43, 0], [0.5, 1, 1], 10);
  for (const side of [-1, 1]) chest.box(0.26, 0.03, 0.07, black, [0, 0.47, side * 0.12], [0, 0, 0], 0.01);
  chest.lathe([[0.09, 0.44], [0.085, 0.49], [0.07, 0.52]].reverse() as [number, number][], black, [0, 0, 0], [0.95, 1, 1], 20);
  // An obi sash in the player's colour, knotted at the side.
  chest.cylinder(0.158, 0.155, 0.05, lace, [0, 0.005, 0], [0, 0, 0], 28, [0.84, 1, 1.2]);
  chest.sphere(0.03, lace, [0.02, 0.0, -0.19], [1, 0.8, 0.8], 10);

  const hips = d.on("pelvis");
  pelvis(hips, hakama, 1.18);
  // A skirt of laced plates at the back, the front ones hang from the thighs so the legs can stride.
  lamellar(hips, black, lace, 0.26, 0.22, 4, [-0.16, -0.03, 0], [0, Math.PI, 0.2]);

  for (const side of ["R", "L"] as const) {
    const s = side === "R" ? 1 : -1;
    const upper = d.on(`upperArm${side}`);
    limb(upper, BODY.upperArm, ARM.upper, under, 1.12);
    // The broad sode hang from the shoulders, outside the arm.
    lamellar(upper, black, lace, 0.2, 0.22, 4, [0, 0.02, s * 0.085], [0, (-s * Math.PI) / 2, 0.12]);
    const fore = d.on(`forearm${side}`);
    limb(fore, BODY.forearm, ARM.fore, under, 1.12);
    // Kote: splinted sleeves of lacquer strips.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      fore.box(0.022, 0.18, 0.012, black, [Math.cos(a) * 0.05, -0.12, Math.sin(a) * 0.05], [0, -a, 0], 0.004);
    }
    fore.cylinder(0.058, 0.05, 0.03, gold, [0, -BODY.forearm + 0.04, 0], [0, 0, 0], 16);
    fist(d.on(`hand${side}`), black, side === "R" ? 1 : -1, 1.08);

    // Wide hakama trousers over the thighs, with the front plates of the skirt.
    const thigh = d.on(`thigh${side}`);
    limb(thigh, BODY.thigh, { ...LEG.thigh, bottom: 0.1 }, hakama, 1.45);
    lamellar(thigh, black, lace, 0.2, 0.24, 4, [0.13, 0.07, s * 0.02], [0, 0, 0.15]);
    const shin = d.on(`shin${side}`);
    limb(shin, BODY.shin, LEG.shin, hakama, 1.25);
    // Suneate: lacquer splints down the shin over the trousers, tied at the top.
    for (let i = -1; i <= 1; i++) shin.box(0.012, 0.26, 0.04, black, [0.068, -0.23, i * 0.042], [0, i * 0.35, 0], 0.005);
    shin.cylinder(0.075, 0.075, 0.02, lace, [0, -0.1, 0], [0, 0, 0], 16);
    boot(d.on(`foot${side}`), kit.cloth(0xe8e2d2, 0.9), kit.leather(0x8a6a3a, 0.8), 0.95);
  }

  kabuto(d.on("head"), kit, black, gold, lace);
}

function kabuto(b: MeshBuilder, kit: LookKit, black: THREE.Material, gold: THREE.Material, lace: THREE.Material): void {
  const mask = kit.lacquer(0x8e1b1b, 0.3);
  neck(b, kit.cloth(0x2e2a33, 0.9));
  // The bowl, ridged with vertical plates, and a gold finial on top.
  b.lathe([[0, 0.37], [0.04, 0.365], [0.09, 0.33], [0.12, 0.27], [0.13, 0.2], [0.132, 0.15], [0, 0.15]].reverse() as [number, number][], black, [0, 0, 0], [1.05, 1, 1], 32);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.rod([Math.cos(a) * 0.133, 0.16, Math.sin(a) * 0.133], [Math.cos(a) * 0.05, 0.36, Math.sin(a) * 0.05], 0.004, gold, 4);
  }
  b.sphere(0.02, gold, [0, 0.375, 0], [1, 0.6, 1], 10);
  // The shikoro: flaring laced lames round the back and sides of the neck.
  for (let i = 0; i < 4; i++) {
    const r = 0.14 + i * 0.03;
    const y = 0.15 - i * 0.045;
    b.add(new THREE.CylinderGeometry(r, r + 0.028, 0.045, 28, 1, true, Math.PI * 0.72, Math.PI * 1.56), black, [0, y, 0]);
    b.add(new THREE.TorusGeometry(r + 0.028, 0.004, 4, 28, Math.PI * 1.56), lace, [0, y - 0.022, 0], [Math.PI / 2, 0, Math.PI * 0.72 - Math.PI / 2]);
  }
  // The fukigaeshi turn back at the temples, and the brim shades the eyes.
  for (const z of [-1, 1]) b.box(0.06, 0.07, 0.012, black, [0.07, 0.16, z * 0.145], [0, z * 0.9, 0], 0.01);
  b.box(0.07, 0.012, 0.25, black, [0.13, 0.16, 0], [0, 0, -0.25], 0.006);
  // Kuwagata: two gold horns sweeping up from the brow, round a crescent.
  for (const z of [-1, 1]) b.tube([[0.14, 0.18, z * 0.03], [0.17, 0.25, z * 0.07], [0.15, 0.36, z * 0.12], [0.1, 0.44, z * 0.14]], 0.008, gold, 16, 6);
  b.add(new THREE.TorusGeometry(0.045, 0.007, 6, 20, Math.PI), gold, [0.15, 0.2, 0], [0, Math.PI / 2, 0]);
  // The menpo: a red mask over the lower face, a fierce nose, and the laced throat guard.
  b.sphere(0.1, mask, [0.06, 0.09, 0], [0.85, 0.75, 1], 20);
  b.sphere(0.022, mask, [0.155, 0.11, 0], [1.2, 1, 0.8], 10);
  for (const z of [-1, 1]) b.box(0.03, 0.008, 0.035, kit.cloth(0xe8e2d2, 0.9), [0.14, 0.075, z * 0.03], [0, z * 0.3, -0.2], 0.003);
  lamellar(b, black, lace, 0.2, 0.1, 3, [0.12, 0.05, 0], [0, 0, 0.3]);
  // Eyes glinting in the shadow of the brim.
  for (const z of [-1, 1]) b.sphere(0.009, kit.glow(0xffe2a0, 1.2), [0.135, 0.145, z * 0.036], [0.5, 0.6, 1], 8);
}
