import type * as THREE from "three";
import type { BodyDims, Dresser } from "./rig";
import type { ZombieMaterials } from "./zombie-materials";

type Mat = THREE.MeshStandardMaterial;

export interface HeadStyle {
  skin: Mat;
  hair: "none" | "short" | "messy" | "stitched";
  /** Rotten nose and a torn cheek. */
  rotten: boolean;
}

/**
 * The head: skull with brow and ears, sunken sockets with glowing eyes, a
 * dark mouth with teeth, and a separate jaw that hangs and snaps. Built
 * facing +z around the head joint, sized by the head measure.
 */
export function dressHead(dress: Dresser, d: BodyDims, m: ZombieMaterials, style: HeadStyle, rand: () => number): void {
  const h = d.head;
  const b = dress.on("head");
  b.box(h * 0.84, h * 0.78, h * 0.9, style.skin, [0, h * 0.6, 0], undefined, h * 0.12);
  b.box(h * 0.7, h * 0.3, h * 0.72, style.skin, [0, h * 0.26, h * 0.06], undefined, h * 0.08);
  b.box(h * 0.86, h * 0.09, h * 0.14, style.skin, [0, h * 0.72, h * 0.4], [0.15, 0, 0], h * 0.03);
  for (const s of [-1, 1]) {
    b.box(h * 0.24, h * 0.15, h * 0.06, m.mouth, [s * h * 0.2, h * 0.6, h * 0.44]);
    b.sphere(h * 0.05, m.eye, [s * h * 0.2, h * 0.6, h * 0.46], [1, 0.8, 0.6], 8);
    b.box(h * 0.07, h * 0.22, h * 0.14, style.skin, [s * h * 0.44, h * 0.55, 0], undefined, h * 0.02);
  }
  if (style.rotten) {
    b.box(h * 0.12, h * 0.12, h * 0.05, m.mouth, [0, h * 0.47, h * 0.45]);
    b.box(h * 0.18, h * 0.16, h * 0.04, m.gore, [h * 0.28 * (rand() < 0.5 ? -1 : 1), h * 0.34, h * 0.4]);
  } else {
    b.box(h * 0.11, h * 0.2, h * 0.12, style.skin, [0, h * 0.48, h * 0.47], [0.25, 0, 0], h * 0.02);
  }
  // The mouth's back wall and upper teeth, seen when the jaw drops.
  b.box(h * 0.52, h * 0.16, h * 0.08, m.mouth, [0, h * 0.3, h * 0.36]);
  for (let i = 0; i < 6; i++) b.box(h * 0.06, h * 0.07 + rand() * h * 0.04, h * 0.04, m.teeth, [(i - 2.5) * h * 0.075, h * 0.34, h * 0.43]);

  if (style.hair === "short" || style.hair === "messy") {
    const tufts = style.hair === "messy" ? 14 : 8;
    for (let i = 0; i < tufts; i++) {
      const x = (rand() - 0.5) * h * 0.8;
      const z = (rand() - 0.6) * h * 0.8;
      b.box(h * (0.16 + rand() * 0.1), h * (0.08 + rand() * (style.hair === "messy" ? 0.16 : 0.05)), h * 0.16, m.hair, [x, h * 0.98, z], [rand() * 0.4 - 0.2, 0, rand() * 0.4 - 0.2]);
    }
    b.box(h * 0.86, h * 0.3, h * 0.2, m.hair, [0, h * 0.8, -h * 0.38], undefined, h * 0.05);
  }
  if (style.hair === "stitched") {
    b.box(h * 0.04, h * 0.02, h * 0.7, m.mouth, [h * 0.1, h * 1.0, 0]);
    for (let i = 0; i < 6; i++) b.box(h * 0.12, h * 0.02, h * 0.02, m.mouth, [h * 0.1, h * 1.0, (i - 2.5) * h * 0.11]);
  }
  b.box(h * 0.2, h * 0.14, h * 0.04, m.blood, [(rand() - 0.5) * h * 0.4, h * 0.82, h * 0.43]);

  // The jaw hangs from the joint at the back of the mouth.
  const j = dress.on("jaw");
  j.box(h * 0.6, h * 0.16, h * 0.44, style.skin, [0, -h * 0.1, h * 0.04], undefined, h * 0.05);
  for (let i = 0; i < 6; i++) j.box(h * 0.055, h * 0.06, h * 0.04, m.teeth, [(i - 2.5) * h * 0.07, -h * 0.01, h * 0.23]);
  j.box(h * 0.2, h * 0.08, h * 0.05, m.blood, [h * 0.1, -h * 0.17, h * 0.2]);

  dress.on("neck").post(h * 0.2, d.neck + 0.06, style.skin, [0, d.neck / 2, 0], 10);
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

/** Chest, belly and hips, with torn cloth, blood and sometimes the ribs showing. */
export function dressTorso(dress: Dresser, d: BodyDims, m: ZombieMaterials, style: TorsoStyle, rand: () => number): void {
  const b = dress.on("spine");
  const top = style.shirt ?? style.skin;
  b.box(d.torsoW, d.torso * 0.62, d.torsoD, top, [0, d.torso * 0.66, 0], undefined, 0.05);
  b.box(d.torsoW * 0.88, d.torso * 0.42, d.torsoD * 0.9, top, [0, d.torso * 0.24, 0], undefined, 0.05);
  b.box(d.shoulderW * 0.94, d.arm * 0.9, d.torsoD * 0.8, top, [0, d.torso - d.arm * 0.5, 0], undefined, d.arm * 0.4);
  if (style.belly > 0) {
    const gut = style.shirt ?? style.skin;
    b.box(d.torsoW * 0.86, d.torso * 0.46, d.torsoD * (0.5 + style.belly * 0.5), gut, [0, d.torso * 0.3, d.torsoD * (0.2 + style.belly * 0.2)], [0.08, 0, 0], d.torsoD * 0.22);
    b.box(d.torsoW * 0.1, 0.03, 0.02, m.mouth, [0, d.torso * 0.34, d.torsoD * (0.45 + style.belly * 0.45)]);
  }
  if (style.shirt) {
    b.box(d.torsoW * 0.5, 0.05, d.torsoD * 0.7, style.shirt, [0, d.torso + 0.005, 0], undefined, 0.02);
    // Ragged strips hanging from the hem.
    for (let i = 0; i < 4; i++) {
      const x = (rand() - 0.5) * d.torsoW * 0.8;
      b.box(0.05 + rand() * 0.04, 0.08 + rand() * 0.1, 0.012, style.shirt, [x, -0.04, d.torsoD * 0.45], [0.1, 0, (rand() - 0.5) * 0.4]);
    }
    // Rips showing grey skin under the cloth.
    for (let i = 0; i < 2; i++) {
      b.box(0.08 + rand() * 0.06, 0.05 + rand() * 0.06, 0.01, style.skin, [(rand() - 0.5) * d.torsoW * 0.7, d.torso * (0.3 + rand() * 0.5), d.torsoD / 2 + 0.004]);
    }
  }
  for (let i = 0; i < 2; i++) {
    const x = (rand() - 0.5) * d.torsoW * 0.7;
    const y = d.torso * (0.25 + rand() * 0.6);
    for (let j = 0; j < 3; j++) {
      b.box(0.03 + rand() * 0.06, 0.04 + rand() * 0.1, 0.006, m.blood, [x + (rand() - 0.5) * 0.06, y - j * 0.05, d.torsoD / 2 + 0.006], [0, 0, (rand() - 0.5) * 0.8]);
    }
  }
  if (style.ribs) {
    const rx = d.torsoW * 0.16;
    b.box(d.torsoW * 0.36, d.torso * 0.34, 0.04, m.gore, [rx, d.torso * 0.6, d.torsoD / 2], undefined, 0.015);
    b.box(d.torsoW * 0.26, d.torso * 0.26, 0.02, m.mouth, [rx, d.torso * 0.6, d.torsoD / 2 + 0.012], undefined, 0.008);
    for (let i = 0; i < 3; i++) {
      const y = d.torso * (0.5 + i * 0.09);
      for (const s of [-1, 1]) b.box(d.torsoW * 0.15, 0.016, 0.02, m.bone, [rx + s * d.torsoW * 0.08, y, d.torsoD / 2 + 0.03], [0, s * -0.3, s * 0.08], 0.006);
    }
  }
  const hips = dress.on("hips");
  hips.box(d.torsoW * 0.92, 0.24, d.torsoD * 0.94, style.pants, [0, -0.04, 0], undefined, 0.04);
  hips.box(d.torsoW * 0.94, 0.045, d.torsoD * 0.96, m.shoe, [0, 0.06, 0], undefined, 0.01);
  hips.box(0.05, 0.04, 0.02, m.steel, [0, 0.06, d.torsoD * 0.48]);
}

export interface LimbStyle {
  skin: Mat;
  sleeve: Mat | null;
  pants: Mat;
  /** Shoes, or bare rotten feet. */
  shoes: boolean;
}

/** Arms with torn sleeves and clawed hands, legs with ragged trousers and shoes. */
export function dressLimbs(dress: Dresser, d: BodyDims, m: ZombieMaterials, style: LimbStyle, rand: () => number): void {
  for (const s of ["L", "R"] as const) {
    const up = dress.on(`shoulder${s}`);
    up.box(d.arm, d.upperArm + 0.04, d.arm, style.sleeve ?? style.skin, [0, -d.upperArm / 2, 0], undefined, d.arm * 0.3);
    if (style.sleeve) up.box(d.arm * 1.08, 0.05, d.arm * 1.08, style.sleeve, [0, -d.upperArm * (0.55 + rand() * 0.3), 0], [0, 0, 0.2]);
    const fore = dress.on(`elbow${s}`);
    fore.box(d.arm * 0.86, d.forearm, d.arm * 0.86, style.skin, [0, -d.forearm / 2, 0], undefined, d.arm * 0.25);
    fore.box(d.arm * 0.4, d.forearm * 0.3, 0.01, m.gore, [0, -d.forearm * 0.4, d.arm * 0.44]);
    const hand = dress.on(`hand${s}`);
    hand.box(d.arm * 0.95, d.hand * 0.7, d.arm * 0.45, style.skin, [0, -d.hand * 0.35, 0.01], undefined, 0.01);
    for (let f = 0; f < 4; f++) {
      const x = (f - 1.5) * d.arm * 0.22;
      hand.box(d.arm * 0.16, d.hand * 0.55, d.arm * 0.16, style.skin, [x, -d.hand * 0.85, d.arm * 0.12], [0.5 + rand() * 0.3, 0, 0]);
      hand.box(d.arm * 0.11, d.hand * 0.1, d.arm * 0.1, m.teeth, [x, -d.hand * 1.08, d.arm * 0.28], [0.9, 0, 0]);
    }
    hand.box(d.arm * 0.18, d.hand * 0.45, d.arm * 0.18, style.skin, [(s === "L" ? -1 : 1) * d.arm * 0.5, -d.hand * 0.5, d.arm * 0.2], [0.4, 0, 0]);

    const thigh = dress.on(`hip${s}`);
    thigh.box(d.leg, d.thigh + 0.04, d.leg, style.pants, [0, -d.thigh / 2, 0], undefined, d.leg * 0.25);
    const shin = dress.on(`knee${s}`);
    const torn = rand() < 0.5;
    const cloth = torn ? d.shin * 0.6 : d.shin;
    shin.box(d.leg * 0.92, cloth, d.leg * 0.92, style.pants, [0, -cloth / 2, 0], undefined, d.leg * 0.2);
    if (torn) {
      shin.box(d.leg * 0.7, d.shin * 0.45, d.leg * 0.7, style.skin, [0, -d.shin * 0.78, 0]);
      for (let i = 0; i < 3; i++) shin.box(d.leg * 0.3, 0.07, 0.02, style.pants, [(i - 1) * d.leg * 0.3, -cloth - 0.02, d.leg * 0.4], [0.2, 0, 0]);
    }
    const foot = dress.on(`ankle${s}`);
    if (style.shoes) {
      foot.box(d.leg * 0.95, d.foot, d.leg * 1.9, m.shoe, [0, -d.foot / 2, d.leg * 0.45], undefined, 0.02);
      foot.box(d.leg, 0.02, d.leg * 1.95, m.mouth, [0, -d.foot + 0.01, d.leg * 0.45]);
    } else {
      foot.box(d.leg * 0.85, d.foot, d.leg * 1.7, style.skin, [0, -d.foot / 2, d.leg * 0.4], undefined, 0.02);
      for (let t = 0; t < 4; t++) foot.box(d.leg * 0.16, d.foot * 0.5, 0.04, style.skin, [(t - 1.5) * d.leg * 0.2, -d.foot * 0.7, d.leg * 1.25]);
    }
  }
}
