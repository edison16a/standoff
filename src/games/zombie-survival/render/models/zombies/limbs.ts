import * as THREE from "three";
import type { MeshBuilder } from "../../mesh-builder";
import type { BodyDims, Dresser } from "./rig";
import type { ZombieMaterials } from "./zombie-materials";

type Mat = THREE.MeshStandardMaterial;

/** A tapering limb segment hanging down from its joint. `depth` squashes it front to back. */
export function limb(b: MeshBuilder, top: number, bottom: number, length: number, mat: Mat, y0 = 0, depth = 1, segments = 12): void {
  b.add(new THREE.CylinderGeometry(top, bottom, length, segments, 2), mat, [0, y0 - length / 2, 0], [0, 0, 0], [1, 1, depth]);
}

export interface LimbStyle {
  skin: Mat;
  sleeve: Mat | null;
  pants: Mat;
  /** Shoes, or bare rotten feet. */
  shoes: boolean;
}

/** A bony hand with long fingers curled into claws, the nails gone black. */
function dressHand(b: MeshBuilder, d: BodyDims, m: ZombieMaterials, skin: Mat, side: 1 | -1, rand: () => number): void {
  const a = d.arm;
  b.sphere(1, skin, [0, -d.hand * 0.32, 0.005], [a * 0.46, d.hand * 0.4, a * 0.22], 10);
  for (let f = 0; f < 4; f++) {
    const x = (f - 1.5) * a * 0.2;
    const curl = 0.45 + rand() * 0.35;
    const len = d.hand * (f === 0 || f === 3 ? 0.5 : 0.6);
    // Two knuckles per finger, bending in toward the palm.
    const y1 = -d.hand * 0.66;
    b.add(new THREE.CylinderGeometry(a * 0.07, a * 0.075, len, 6), skin, [x, y1 - Math.cos(curl) * len * 0.5, Math.sin(curl) * len * 0.5], [-curl, 0, 0]);
    const tipY = y1 - Math.cos(curl) * len;
    const tipZ = Math.sin(curl) * len;
    b.add(new THREE.ConeGeometry(a * 0.06, len * 0.55, 5), m.teeth, [x, tipY - Math.cos(curl * 1.8) * len * 0.22, tipZ + Math.sin(curl * 1.8) * len * 0.22], [Math.PI - curl * 1.8, 0, 0]);
  }
  b.add(new THREE.CylinderGeometry(a * 0.07, a * 0.08, d.hand * 0.45, 6), skin, [side * -a * 0.42, -d.hand * 0.45, a * 0.14], [0.6, 0, side * 0.5]);
}

/** Arms with torn sleeves and clawed hands, legs with ragged trousers and shoes. */
export function dressLimbs(dress: Dresser, d: BodyDims, m: ZombieMaterials, style: LimbStyle, rand: () => number): void {
  const a = d.arm;
  const l = d.leg;
  for (const s of ["L", "R"] as const) {
    const side = s === "L" ? 1 : -1;
    const sleeve = style.sleeve ?? style.skin;
    // Upper arm: a round shoulder, a wasted bicep, narrowing to the elbow.
    const up = dress.on(`shoulder${s}`);
    up.sphere(a * 0.6, sleeve, [0, -a * 0.05, 0], [1, 1, 1], 12);
    limb(up, a * 0.56, a * 0.44, d.upperArm, sleeve, 0, 0.95);
    if (style.sleeve) {
      // The sleeve ends in a ragged cuff.
      const cuff = d.upperArm * (0.55 + rand() * 0.3);
      up.add(new THREE.CylinderGeometry(a * 0.53, a * 0.56, 0.05, 10, 1, true), style.sleeve, [0, -cuff, 0], [0, 0, 0.18 * side]);
      limb(up, a * 0.46, a * 0.42, d.upperArm - cuff, style.skin, -cuff, 0.95);
    } else {
      up.sphere(a * 0.34, style.skin, [0, -d.upperArm * 0.4, a * 0.16], [1, 1.5, 0.9], 10);
    }
    // Forearm: a knobbly elbow and a thin wrist, with a bite taken out of it.
    const fore = dress.on(`elbow${s}`);
    fore.sphere(a * 0.44, style.skin, [0, 0, 0], [1, 1, 1], 10);
    limb(fore, a * 0.46, a * 0.3, d.forearm, style.skin, 0, 0.9);
    fore.sphere(a * 0.2, m.gore, [side * a * 0.05, -d.forearm * 0.42, a * 0.3], [1, 1.5, 0.45], 8);
    const hand = dress.on(`hand${s}`);
    hand.sphere(a * 0.3, style.skin, [0, 0, 0], [1, 0.8, 0.7], 8);
    dressHand(hand, d, m, style.skin, side, rand);

    // Thigh: a heavy round hip joint and the leg narrowing to the knee.
    const thigh = dress.on(`hip${s}`);
    thigh.sphere(l * 0.56, style.pants, [0, -0.02, 0], [1, 1, 1], 12);
    limb(thigh, l * 0.56, l * 0.44, d.thigh + 0.02, style.pants, 0, 1);
    const shin = dress.on(`knee${s}`);
    shin.sphere(l * 0.46, style.pants, [0, 0, 0.005], [1, 1, 1], 10);
    const torn = rand() < 0.5;
    const cloth = torn ? d.shin * 0.55 : d.shin;
    limb(shin, l * 0.46, torn ? l * 0.4 : l * 0.34, cloth, style.pants, 0, 1);
    if (torn) {
      // The trouser leg is ripped off at mid shin: a bare bony leg below it.
      limb(shin, l * 0.34, l * 0.26, d.shin - cloth + 0.02, style.skin, -cloth + 0.02, 1);
      for (let i = 0; i < 4; i++) {
        const t = (i / 4) * Math.PI * 2 + rand();
        shin.box(l * 0.22, 0.06 + rand() * 0.05, 0.012, style.pants, [Math.sin(t) * l * 0.4, -cloth - 0.03, Math.cos(t) * l * 0.4], [0.15, t, 0]);
      }
    }
    const foot = dress.on(`ankle${s}`);
    if (style.shoes) {
      foot.sphere(1, m.shoe, [0, -d.foot * 0.5, l * 0.42], [l * 0.5, d.foot * 0.6, l * 0.98], 12);
      foot.box(l * 0.92, 0.022, l * 1.9, m.mouth, [0, -d.foot + 0.011, l * 0.42], undefined, 0.01);
    } else {
      foot.sphere(1, style.skin, [0, -d.foot * 0.5, l * 0.36], [l * 0.42, d.foot * 0.55, l * 0.85], 10);
      for (let t = 0; t < 4; t++) foot.sphere(l * 0.09, style.skin, [(t - 1.5) * l * 0.19, -d.foot * 0.75, l * 1.12], [1, 0.8, 1.5], 6);
    }
  }
}
