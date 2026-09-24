import * as THREE from "three";
import { cloth } from "../../surfaces";
import { makeReadable } from "./readable";
import type { BodyDims, Dresser } from "./rig";
import type { ZombieMaterials } from "./zombie-materials";

/** Who the dead were, which depends on where they are met. */
export type Outfit = "town" | "patient" | "doctor" | "worker";

interface OutfitMaterials {
  gown: THREE.MeshStandardMaterial;
  coat: THREE.MeshStandardMaterial;
  bandage: THREE.MeshStandardMaterial;
  hiVis: THREE.MeshStandardMaterial;
  reflective: THREE.MeshStandardMaterial;
  hardHat: THREE.MeshStandardMaterial;
}

let shared: OutfitMaterials | null = null;

export function outfitMaterials(): OutfitMaterials {
  if (shared) return shared;
  const map = cloth();
  const std = (p: THREE.MeshStandardMaterialParameters) => makeReadable(new THREE.MeshStandardMaterial({ roughness: 0.85, ...p }));
  shared = {
    gown: std({ color: 0x6a8494, map }),
    coat: std({ color: 0xa8a69e, map }),
    bandage: std({ color: 0xb8b09a, map }),
    hiVis: std({ color: 0xd8641a, map, emissive: 0x3a1400 }),
    reflective: std({ color: 0xc8c8c8, emissive: 0x505050, roughness: 0.3, metalness: 0.4 }),
    hardHat: std({ color: 0xd8b41a, roughness: 0.4 }),
  };
  return shared;
}

/** A hospital gown down to the knees, a bandaged head and a name band on the wrist. */
export function dressPatient(dress: Dresser, d: BodyDims, m: ZombieMaterials, rand: () => number): void {
  const o = outfitMaterials();
  dress.on("hips").box(d.torsoW * 1.04, 0.52, d.torsoD * 1.08, o.gown, [0, -0.22, 0], undefined, 0.03);
  for (let i = 0; i < 3; i++) dress.on("hips").box(0.08, 0.1 + rand() * 0.08, 0.012, o.gown, [(i - 1) * d.torsoW * 0.3, -0.5, d.torsoD * 0.5], [0.08, 0, (rand() - 0.5) * 0.4]);
  const h = d.head;
  dress.on("head").box(h * 0.9, h * 0.16, h * 0.96, o.bandage, [0, h * 0.8, 0], [0.12, 0, 0], h * 0.05);
  dress.on("head").box(h * 0.16, h * 0.1, h * 0.03, m.blood, [h * 0.18, h * 0.8, h * 0.47]);
  dress.on("handL").box(d.arm * 1.02, 0.03, d.arm * 0.6, o.bandage, [0, 0.01, 0]);
}

/** A doctor's white coat over the clothes, its tails hanging open, and a stethoscope. */
export function dressDoctor(dress: Dresser, d: BodyDims, m: ZombieMaterials): void {
  const o = outfitMaterials();
  const spine = dress.on("spine");
  spine.box(d.torsoW * 1.08, d.torso * 0.92, d.torsoD * 1.12, o.coat, [0, d.torso * 0.5, 0], undefined, 0.04);
  spine.box(d.torsoW * 0.18, d.torso * 0.9, 0.012, m.shirts[1]!, [0, d.torso * 0.5, d.torsoD * 0.57]);
  for (const s of [-1, 1]) {
    dress.on("hips").box(d.torsoW * 0.5, 0.42, 0.03, o.coat, [s * d.torsoW * 0.28, -0.2, d.torsoD * 0.56], [0.06, 0, s * 0.04]);
    dress.on(s > 0 ? "shoulderL" : "shoulderR").box(d.arm * 1.12, d.upperArm * 0.9, d.arm * 1.12, o.coat, [0, -d.upperArm * 0.45, 0], undefined, 0.02);
  }
  spine.add(new THREE.TorusGeometry(d.torsoW * 0.22, 0.008, 6, 20, Math.PI), m.shoe, [0, d.torso * 0.88, d.torsoD * 0.5], [0, 0, Math.PI]);
  spine.sphere(0.022, m.steel, [d.torsoW * 0.1, d.torso * 0.62, d.torsoD * 0.58], [1, 1, 0.4], 8);
}

/** A dock or road worker: orange vest with silver stripes and a yellow hard hat. */
export function dressWorker(dress: Dresser, d: BodyDims): void {
  const o = outfitMaterials();
  const spine = dress.on("spine");
  spine.box(d.torsoW * 1.07, d.torso * 0.72, d.torsoD * 1.12, o.hiVis, [0, d.torso * 0.58, 0], undefined, 0.04);
  for (const y of [0.42, 0.62]) spine.box(d.torsoW * 1.09, 0.035, d.torsoD * 1.14, o.reflective, [0, d.torso * y, 0]);
  const h = d.head;
  const head = dress.on("head");
  head.box(h * 0.96, h * 0.34, h * 1.0, o.hardHat, [0, h * 1.02, -h * 0.02], undefined, h * 0.16);
  head.box(h * 1.1, h * 0.04, h * 1.2, o.hardHat, [0, h * 0.86, h * 0.06], undefined, h * 0.02);
}
