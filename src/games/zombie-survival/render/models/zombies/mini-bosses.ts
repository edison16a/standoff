import * as THREE from "three";
import { dressHead, dressTorso } from "./anatomy";
import { dressLimbs } from "./limbs";
import { outfitMaterials } from "./outfits";
import type { BodyDims, Dresser } from "./rig";
import type { ZombieMaterials } from "./zombie-materials";

/**
 * The two newer mini bosses. The Surgeon is tall and gaunt, still in his
 * scrubs, cap and mask, a bone saw in one hand and blades for fingers on
 * the other. The Hook is a hulking dock hand in a leather coat with hi
 * vis stripes and a woollen hat, a cargo hook in his fist.
 */

/** Scrubs, a cap and a mask, a bone saw and scalpel fingers. */
export function dressSurgeon(dress: Dresser, d: BodyDims, m: ZombieMaterials, rand: () => number): void {
  const o = outfitMaterials();
  const skin = m.skins[1]!;
  dressHead(dress, d, m, { skin, hair: "none", rotten: true }, rand);
  dressTorso(dress, d, m, { skin, shirt: o.gown, pants: o.gown, ribs: false, belly: 0 }, rand);
  dressLimbs(dress, d, m, { skin, sleeve: null, pants: o.gown, shoes: true }, rand);
  const h = d.head;
  const head = dress.on("head");
  // A cloth cap over the crown and a mask pulled down under the nose, soaked through.
  head.sphere(h * 0.52, o.gown, [0, h * 0.74, -h * 0.06], [0.92, 0.72, 1.02], 14);
  head.box(h * 0.62, h * 0.3, h * 0.08, o.coat, [0, h * 0.3, h * 0.42], [0.1, 0, 0], h * 0.04);
  head.box(h * 0.3, h * 0.14, h * 0.02, m.blood, [h * 0.08, h * 0.24, h * 0.47]);
  // A long surgical apron down the front, streaked with old blood.
  const spine = dress.on("spine");
  spine.box(d.torsoW * 0.9, d.torso * 0.95, 0.02, o.coat, [0, d.torso * 0.45, d.torsoD * 0.56], [-0.04, 0, 0], 0.01);
  for (let i = 0; i < 5; i++) spine.box(0.04 + rand() * 0.05, 0.12 + rand() * 0.2, 0.01, m.blood, [(rand() - 0.5) * d.torsoW * 0.7, d.torso * (0.1 + rand() * 0.7), d.torsoD * 0.58]);
  dress.on("hips").box(d.torsoW * 0.9, 0.5, 0.02, o.coat, [0, -0.25, d.torsoD * 0.56], [0.05, 0, 0], 0.01);
  // The bone saw: a grip, a steel frame and a toothed blade.
  const saw = dress.on("handR");
  saw.box(0.05, 0.14, 0.05, m.leather, [0, -0.1, 0.03]);
  saw.box(0.012, 0.08, 0.5, m.steel, [0, -0.2, 0.3]);
  saw.box(0.006, 0.05, 0.46, m.teeth, [0, -0.25, 0.3]);
  saw.box(0.012, 0.06, 0.02, m.blood, [0.001, -0.24, 0.42]);
  // Scalpels where the fingers were.
  for (let f = 0; f < 3; f++) dress.on("handL").add(new THREE.ConeGeometry(0.012, 0.22, 4), m.steel, [(f - 1) * 0.035, -d.hand - 0.1, 0.04], [Math.PI - 0.25, 0, 0]);
}

/** A leather dock coat with hi vis stripes, a woollen hat, a chain round one arm and a cargo hook. */
export function dressHook(dress: Dresser, d: BodyDims, m: ZombieMaterials, rand: () => number): void {
  const o = outfitMaterials();
  const skin = m.skins[2]!;
  const coat = m.leather;
  dressHead(dress, d, m, { skin, hair: "stitched", rotten: true }, rand);
  dressTorso(dress, d, m, { skin, shirt: m.shirts[4]!, pants: m.pants[0]!, ribs: false, belly: 0.6 }, rand);
  dressLimbs(dress, d, m, { skin, sleeve: coat, pants: m.pants[0]!, shoes: true }, rand);
  const h = d.head;
  // A knitted hat rolled up at the brim.
  const head = dress.on("head");
  head.sphere(h * 0.52, m.shirts[1]!, [0, h * 0.8, -h * 0.05], [0.95, 0.7, 1.02], 14);
  head.add(new THREE.TorusGeometry(h * 0.46, h * 0.07, 6, 18), m.shirts[1]!, [0, h * 0.66, -h * 0.03], [Math.PI / 2, 0, 0]);
  // The coat hangs open over the shirt, its tails stopping above the knee so the weak points there show.
  const spine = dress.on("spine");
  spine.box(d.torsoW * 1.08, d.torso * 0.92, d.torsoD * 1.12, coat, [0, d.torso * 0.5, -0.01], undefined, 0.05);
  spine.box(d.torsoW * 0.34, d.torso * 0.9, 0.02, m.shirts[4]!, [0, d.torso * 0.5, d.torsoD * 0.57]);
  for (const s of [-1, 1]) dress.on("hips").box(d.torsoW * 0.5, 0.34, 0.04, coat, [s * d.torsoW * 0.28, -0.14, d.torsoD * 0.56], [0.06, 0, s * 0.04]);
  for (const y of [0.4, 0.62]) {
    for (const s of [-1, 1]) spine.box(d.torsoW * 0.36, 0.045, 0.02, o.reflective, [s * d.torsoW * 0.36, d.torso * y, d.torsoD * 0.57]);
  }
  // A chain wound round the left forearm, its end hanging loose.
  for (let i = 0; i < 5; i++) dress.on("elbowL").add(new THREE.TorusGeometry(d.arm * 0.5, 0.014, 5, 12), m.steel, [0, -0.06 - i * 0.05, 0], [Math.PI / 2 + (i % 2) * 0.3, 0, 0.15 * (i % 2 ? 1 : -1)]);
  for (let i = 0; i < 4; i++) dress.on("handL").add(new THREE.TorusGeometry(0.035, 0.012, 5, 10), m.steel, [0, -0.12 - i * 0.06, 0.02], [0, (i % 2) * Math.PI / 2, 0]);
  // The cargo hook: a grip, a shaft and the curved point, rusted dark.
  const hook = dress.on("handR");
  hook.box(0.06, 0.16, 0.06, m.leather, [0, -0.1, 0.02]);
  hook.add(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 8), m.steel, [0, -0.3, 0.05]);
  hook.add(new THREE.TorusGeometry(0.12, 0.028, 8, 16, Math.PI * 1.3), m.steel, [0, -0.56, 0.14], [0, Math.PI / 2, Math.PI * 0.35]);
  hook.add(new THREE.ConeGeometry(0.03, 0.1, 6), m.steel, [0, -0.5, 0.27], [0.6, 0, 0]);
}
