import * as THREE from "three";
import { limb } from "./limbs";
import type { BodyDims, Dresser } from "./rig";
import type { ZombieMaterials } from "./zombie-materials";

type Mat = THREE.MeshStandardMaterial;

/**
 * The body is modelled from rounded, tapering forms rather than blocks:
 * a skull with brow, cheekbones and sunken sockets, a rib cage and
 * belly, arms and legs that narrow toward the wrist and ankle with the
 * joints rounded over, and bony clawed hands. Every part is merged per
 * bone by the Dresser, so the detail costs vertices, not draw calls.
 */

export interface HeadStyle {
  skin: Mat;
  hair: "none" | "short" | "messy" | "stitched";
  /** Rotten nose and a torn cheek. */
  rotten: boolean;
}

/**
 * The head: a skull with a heavy brow, hollow cheeks and sunken sockets
 * holding glowing eyes, a dark mouth with teeth, and a separate jaw that
 * hangs and snaps. Built facing +z around the head joint.
 */
export function dressHead(dress: Dresser, d: BodyDims, m: ZombieMaterials, style: HeadStyle, rand: () => number): void {
  const h = d.head;
  const b = dress.on("head");
  const skin = style.skin;
  // Cranium, and the narrower face below it.
  b.sphere(h * 0.5, skin, [0, h * 0.64, -h * 0.04], [0.88, 0.98, 1.04], 18);
  b.sphere(h * 0.36, skin, [0, h * 0.4, h * 0.1], [1.02, 0.95, 0.95], 14);
  // Brow ridge, cheekbones and temples: the bone shows through the rot.
  for (const s of [-1, 1]) {
    b.sphere(h * 0.15, skin, [s * h * 0.15, h * 0.68, h * 0.34], [1.35, 0.5, 0.7], 10);
    b.sphere(h * 0.11, skin, [s * h * 0.25, h * 0.46, h * 0.28], [1, 0.72, 0.85], 10);
    b.sphere(h * 0.085, skin, [s * h * 0.43, h * 0.54, -h * 0.02], [0.4, 1, 0.7], 8);
    // Deep sockets with the eyes sunk in them.
    b.sphere(h * 0.1, m.mouth, [s * h * 0.155, h * 0.575, h * 0.37], [1.15, 0.85, 0.55], 10);
    b.sphere(h * 0.048, m.eye, [s * h * 0.155, h * 0.575, h * 0.405], [1, 0.85, 0.7], 8);
    dress.eye("head", [s * h * 0.155, h * 0.575, h * 0.44], h * 0.34);
  }
  if (style.rotten) {
    // The nose is gone, and a cheek is torn open to the teeth.
    b.sphere(h * 0.06, m.mouth, [0, h * 0.46, h * 0.43], [1, 1.2, 0.6], 8);
    const side = rand() < 0.5 ? -1 : 1;
    b.sphere(h * 0.12, m.gore, [side * h * 0.24, h * 0.34, h * 0.3], [0.9, 0.8, 0.5], 10);
    b.sphere(h * 0.07, m.mouth, [side * h * 0.25, h * 0.33, h * 0.35], [1, 0.7, 0.4], 8);
  } else {
    b.add(new THREE.ConeGeometry(h * 0.055, h * 0.16, 6), skin, [0, h * 0.48, h * 0.44], [0.35, 0, 0], [1, 1, 0.8]);
  }
  // The mouth's dark back and the upper teeth, seen when the jaw drops.
  b.sphere(h * 0.18, m.mouth, [0, h * 0.28, h * 0.28], [1.1, 0.55, 0.7], 10);
  for (let i = 0; i < 6; i++) b.box(h * 0.055, h * 0.07 + rand() * h * 0.04, h * 0.04, m.teeth, [(i - 2.5) * h * 0.07, h * 0.3, h * 0.39 - Math.abs(i - 2.5) * h * 0.02], [0, (i - 2.5) * 0.18, 0], h * 0.01);

  if (style.hair === "short" || style.hair === "messy") {
    // A cap of matted hair over the crown, with clumps sticking out of it.
    b.sphere(h * 0.51, m.hair, [0, h * 0.7, -h * 0.08], [0.9, 0.86, 1.02], 14);
    const tufts = style.hair === "messy" ? 12 : 6;
    for (let i = 0; i < tufts; i++) {
      const a = rand() * Math.PI * 2;
      const r = h * (0.2 + rand() * 0.2);
      b.add(new THREE.ConeGeometry(h * 0.07, h * (0.14 + rand() * (style.hair === "messy" ? 0.2 : 0.06)), 5), m.hair, [Math.cos(a) * r, h * 1.06, Math.sin(a) * r - h * 0.08], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]);
    }
  }
  if (style.hair === "stitched") {
    b.box(h * 0.035, h * 0.02, h * 0.7, m.mouth, [h * 0.1, h * 1.1, -h * 0.04], [0.1, 0, 0]);
    for (let i = 0; i < 6; i++) b.box(h * 0.12, h * 0.018, h * 0.02, m.mouth, [h * 0.1, h * 1.1 - Math.abs(i - 2.5) * h * 0.02, (i - 2.5) * h * 0.11 - h * 0.04]);
  }
  b.sphere(h * 0.09, m.blood, [(rand() - 0.5) * h * 0.4, h * 0.84, h * 0.34], [1.2, 0.8, 0.3], 8);

  // The jaw hangs from the joint at the back of the mouth.
  const j = dress.on("jaw");
  j.sphere(h * 0.26, skin, [0, -h * 0.1, h * 0.06], [1.05, 0.5, 0.95], 12);
  for (let i = 0; i < 6; i++) j.box(h * 0.05, h * 0.06, h * 0.04, m.teeth, [(i - 2.5) * h * 0.065, -h * 0.01, h * 0.26 - Math.abs(i - 2.5) * h * 0.02], [0, (i - 2.5) * 0.18, 0], h * 0.01);
  j.sphere(h * 0.08, m.blood, [h * 0.1, -h * 0.16, h * 0.22], [1, 0.6, 0.4], 8);

  // A thin neck with the tendons standing out.
  const neck = dress.on("neck");
  limb(neck, h * 0.17, h * 0.21, d.neck + 0.08, skin, d.neck + 0.05, 0.9, 10);
  for (const s of [-1, 1]) neck.add(new THREE.CylinderGeometry(h * 0.03, h * 0.035, d.neck + 0.1, 6), skin, [s * h * 0.09, d.neck / 2, h * 0.1], [0.2, 0, s * 0.25]);
}

export interface TorsoStyle {
  skin: Mat;
  /** Null for a bare chest. */
  shirt: Mat | null;
  pants: Mat;
  ribs: boolean;
  /** 0 for none, up to 1 for a big gut. */
  belly: number;
}

/** How far forward the chest's surface is at (x, y), so things laid on it sit on it. */
function chestFront(d: BodyDims, x: number, y: number): number {
  const chest = 1 - (x / (d.torsoW * 0.5)) ** 2 - ((y - d.torso * 0.66) / (d.torso * 0.38)) ** 2;
  const waist = 1 - (x / (d.torsoW * 0.44)) ** 2;
  return Math.max((d.torsoD / 2) * Math.sqrt(Math.max(0, chest)), (d.torsoD * 0.44) * Math.sqrt(Math.max(0, waist)) * (y < d.torso * 0.62 ? 1 : 0)) + 0.004;
}

/** Chest, belly and hips, with torn cloth, blood and sometimes the ribs showing. */
export function dressTorso(dress: Dresser, d: BodyDims, m: ZombieMaterials, style: TorsoStyle, rand: () => number): void {
  const b = dress.on("spine");
  const top = style.shirt ?? style.skin;
  const deep = d.torsoD / d.torsoW;
  // Rib cage, waist and the slope of the shoulders.
  b.sphere(1, top, [0, d.torso * 0.66, 0], [d.torsoW * 0.5, d.torso * 0.38, d.torsoD * 0.5], 18);
  limb(b, d.torsoW * 0.46, d.torsoW * 0.42, d.torso * 0.56, top, d.torso * 0.6, deep * 1.05, 16);
  b.sphere(1, top, [0, d.torso - d.arm * 0.45, -d.torsoD * 0.04], [d.shoulderW * 0.47, d.arm * 0.6, d.torsoD * 0.42], 14);
  if (!style.shirt) {
    // Wasted muscle over the ribs of a bare chest.
    for (const s of [-1, 1]) b.sphere(1, style.skin, [s * d.torsoW * 0.2, d.torso * 0.74, d.torsoD * 0.12], [d.torsoW * 0.24, d.torso * 0.15, d.torsoD * 0.42], 12);
  }
  if (style.belly > 0) {
    const gut = style.shirt ?? style.skin;
    b.sphere(1, gut, [0, d.torso * 0.3, d.torsoD * (0.08 + style.belly * 0.14)], [d.torsoW * 0.44, d.torso * 0.3, d.torsoD * (0.42 + style.belly * 0.2)], 16);
    b.sphere(0.018, m.mouth, [0, d.torso * 0.32, d.torsoD * (0.5 + style.belly * 0.34)], [1, 1, 0.5], 6);
  }
  if (style.shirt) {
    // A collar, and ragged strips hanging from the hem.
    b.add(new THREE.TorusGeometry(d.head * 0.28, 0.018, 6, 16), style.shirt, [0, d.torso + 0.01, 0], [Math.PI / 2 + 0.2, 0, 0], [1, 1, 0.8]);
    for (let i = 0; i < 5; i++) {
      const x = (rand() - 0.5) * d.torsoW * 0.8;
      b.box(0.05 + rand() * 0.04, 0.08 + rand() * 0.12, 0.012, style.shirt, [x, -0.02 - rand() * 0.03, chestFront(d, x, d.torso * 0.3) - 0.01], [0.12, 0, (rand() - 0.5) * 0.5]);
    }
    // Rips showing grey skin under the cloth.
    for (let i = 0; i < 3; i++) {
      const x = (rand() - 0.5) * d.torsoW * 0.6;
      const y = d.torso * (0.3 + rand() * 0.5);
      b.sphere(0.05 + rand() * 0.03, style.skin, [x, y, chestFront(d, x, y) - 0.02], [1.2, 0.8, 0.35], 8);
    }
  }
  // Dried blood running down the front.
  for (let i = 0; i < 2; i++) {
    const x = (rand() - 0.5) * d.torsoW * 0.6;
    const y = d.torso * (0.35 + rand() * 0.5);
    for (let j = 0; j < 3; j++) {
      const yy = y - j * 0.06;
      b.sphere(0.022 + rand() * 0.02, m.blood, [x + (rand() - 0.5) * 0.05, yy, chestFront(d, x, yy) - 0.012], [1, 1.8, 0.2], 6);
    }
  }
  if (style.ribs) {
    // A wound torn through to the ribs.
    const rx = d.torsoW * 0.16;
    const ry = d.torso * 0.6;
    const z = chestFront(d, rx, ry);
    // Torn flesh round the edge, a dark hollow, and the ribs bridging it.
    b.sphere(1, m.gore, [rx, ry, z - 0.04], [d.torsoW * 0.2, d.torso * 0.19, 0.05], 12);
    b.sphere(1, m.mouth, [rx, ry, z - 0.03], [d.torsoW * 0.15, d.torso * 0.15, 0.036], 10);
    for (let i = 0; i < 4; i++) {
      const y = ry + (i - 1.5) * d.torso * 0.07;
      b.add(new THREE.CylinderGeometry(0.011, 0.011, d.torsoW * 0.3, 6), m.bone, [rx, y, z - 0.004], [0, 0, Math.PI / 2 + 0.12]);
    }
  }
  const hips = dress.on("hips");
  limb(hips, d.torsoW * 0.44, d.torsoW * 0.47, 0.2, style.pants, 0.08, deep * 1.05, 16);
  hips.sphere(1, style.pants, [0, -0.12, 0], [d.torsoW * 0.47, 0.08, d.torsoD * 0.49], 14);
  hips.add(new THREE.CylinderGeometry(d.torsoW * 0.465, d.torsoW * 0.465, 0.05, 18, 1, true), m.shoe, [0, 0.05, 0], [0, 0, 0], [1, 1, deep * 1.08]);
  hips.box(0.055, 0.042, 0.02, m.steel, [0, 0.05, d.torsoD * 0.5 + 0.006], undefined, 0.006);
}
