import * as THREE from "three";
import { KINDS, type BossKind } from "../../../engine/zombie-kinds";
import type { MeshBuilder, V3 } from "../../mesh-builder";
import { dressHead, dressLimbs, dressTorso } from "./anatomy";
import { seededRand } from "./commoners";
import { Dresser, makeRig, standardProxies, type BodyDims, type Rig } from "./rig";
import { addWeakPoints, type WeakMarker } from "./weak-points";
import { zombieMaterials } from "./zombie-materials";

const BASE: BodyDims = {
  thigh: 0.42, shin: 0.4, foot: 0.08, torso: 0.62, torsoW: 0.6, torsoD: 0.4, shoulderW: 0.8, hipW: 0.3,
  upperArm: 0.34, forearm: 0.32, hand: 0.14, neck: 0.06, head: 0.26, arm: 0.18, leg: 0.22,
};

interface BossPlan {
  dims: BodyDims;
  /** Scale from the built size to the kind's height. */
  scale: number;
  weakRadius: number;
}

const PLANS: Record<BossKind, BossPlan> = {
  butcher: { dims: { ...BASE, torsoW: 0.72, torsoD: 0.5, shoulderW: 0.86, arm: 0.2, leg: 0.24 }, scale: 1.5, weakRadius: 0.085 },
  tank: {
    dims: { ...BASE, thigh: 0.36, shin: 0.36, torso: 0.6, torsoW: 0.8, torsoD: 0.5, shoulderW: 1.06, arm: 0.26, upperArm: 0.34, forearm: 0.36, hand: 0.22, head: 0.22, neck: 0.02, leg: 0.25 },
    scale: 1.95,
    weakRadius: 0.075,
  },
  juggernaut: { dims: { ...BASE, torsoW: 0.66, torsoD: 0.46, shoulderW: 0.9, arm: 0.2, leg: 0.24, head: 0.3 }, scale: 1.62, weakRadius: 0.08 },
  behemoth: {
    dims: { ...BASE, thigh: 0.55, shin: 0.52, torso: 0.72, torsoW: 0.62, torsoD: 0.42, shoulderW: 0.92, upperArm: 0.55, forearm: 0.55, hand: 0.24, arm: 0.17, leg: 0.21, head: 0.32, neck: 0.14 },
    scale: 1.95,
    weakRadius: 0.07,
  },
};

const cone = (b: MeshBuilder, r: number, h: number, mat: THREE.Material, at: V3, rot: V3) => b.add(new THREE.ConeGeometry(r, h, 7), mat, at, rot);

/**
 * The four bosses, each with its own silhouette. The Butcher is a huge
 * gut in a bloody apron with a cleaver. The Tank is all shoulders and
 * fists with bone spikes. The Juggernaut is sealed in a bomb suit with
 * bare joints. The Behemoth is a towering thing with long arms, spines
 * down its back and a burning core in an open ribcage.
 */
export function buildBoss(kind: BossKind, seed: number): { rig: Rig; weak: WeakMarker[] } {
  const m = zombieMaterials();
  const rand = seededRand(seed);
  const plan = PLANS[kind];
  const d = plan.dims;
  const rig = makeRig(d);
  const dress = new Dresser(rig);
  const skin = kind === "tank" ? m.skins[2]! : kind === "behemoth" ? m.skins[1]! : m.skins[0]!;

  if (kind === "butcher") {
    dressHead(dress, d, m, { skin, hair: "stitched", rotten: true }, rand);
    dressTorso(dress, d, m, { skin, shirt: null, pants: m.pants[1]!, ribs: false, belly: 1 }, rand);
    dressLimbs(dress, d, m, { skin, sleeve: null, pants: m.pants[1]!, shoes: true }, rand);
    const chest = dress.on("spine");
    chest.box(d.torsoW * 0.95, d.torso * 1.2, 0.03, m.leather, [0, d.torso * 0.28, d.torsoD * 0.5 + 0.24], [0.12, 0, 0]);
    for (let i = 0; i < 5; i++) chest.box(0.08 + rand() * 0.12, 0.06 + rand() * 0.14, 0.01, m.blood, [(rand() - 0.5) * 0.5, d.torso * (0.1 + rand() * 0.6), d.torsoD * 0.5 + 0.27], [0.12, 0, 0]);
    for (const s of [-1, 1]) chest.box(0.04, d.torso * 0.6, 0.02, m.leather, [s * 0.2, d.torso * 0.75, d.torsoD * 0.5 + 0.02]);
    const hand = dress.on("handR");
    hand.box(0.05, 0.16, 0.05, m.leather, [0, -0.1, 0.02]);
    hand.box(0.018, 0.32, 0.42, m.steel, [0, -0.26, 0.2]);
    hand.box(0.02, 0.1, 0.2, m.blood, [0.001, -0.3, 0.3]);
    for (let i = 0; i < 4; i++) dress.on("handL").box(0.025, 0.025, 0.025, m.steel, [0, -0.16 - i * 0.03, 0.02], [i * 0.6, 0, 0]);
  } else if (kind === "tank") {
    dressHead(dress, d, m, { skin, hair: "none", rotten: true }, rand);
    dressTorso(dress, d, m, { skin, shirt: null, pants: m.pants[0]!, ribs: true, belly: 0.2 }, rand);
    dressLimbs(dress, d, m, { skin, sleeve: null, pants: m.pants[0]!, shoes: false }, rand);
    const back = dress.on("spine");
    back.sphere(d.torsoW * 0.55, skin, [0, d.torso * 0.85, -d.torsoD * 0.3], [1.3, 0.8, 0.9], 14);
    for (let i = 0; i < 6; i++) cone(back, 0.05, 0.28, m.bone, [(i % 3 - 1) * 0.22, d.torso * (0.9 + (i > 2 ? 0.12 : 0)), -d.torsoD * 0.55], [-0.9, 0, (i % 3 - 1) * 0.4]);
    for (const s of ["L", "R"] as const) {
      const shoulder = dress.on(`shoulder${s}`);
      shoulder.sphere(d.arm * 0.95, skin, [0, -0.02, 0], [1.25, 1, 1.15], 12);
      for (let i = 0; i < 3; i++) cone(shoulder, 0.045, 0.26, m.bone, [(s === "L" ? 1 : -1) * (0.08 + i * 0.04), 0.1, -0.06 + i * 0.05], [0, 0, (s === "L" ? -1 : 1) * (0.5 + i * 0.2)]);
      dress.on(`elbow${s}`).sphere(d.arm * 0.8, skin, [0, -d.forearm * 0.55, 0], [1.1, 1.3, 1.1], 12);
      dress.on(`hand${s}`).box(d.hand * 1.4, d.hand * 1.1, d.hand * 1.1, skin, [0, -d.hand * 0.6, 0.02], undefined, 0.04);
    }
  } else if (kind === "juggernaut") {
    dressHead(dress, d, m, { skin, hair: "none", rotten: true }, rand);
    dressTorso(dress, d, m, { skin, shirt: m.armorDark, pants: m.armorDark, ribs: false, belly: 0.3 }, rand);
    dressLimbs(dress, d, m, { skin, sleeve: m.armorDark, pants: m.armorDark, shoes: true }, rand);
    const h = d.head;
    const head = dress.on("head");
    head.box(h * 1.2, h * 1.2, h * 1.2, m.armor, [0, h * 0.6, -h * 0.05], undefined, h * 0.3);
    head.box(h * 0.8, h * 0.36, h * 0.06, m.visor, [0, h * 0.62, h * 0.56]);
    const chest = dress.on("spine");
    chest.box(d.torsoW * 1.2, d.torso * 0.95, d.torsoD * 1.3, m.armor, [0, d.torso * 0.52, 0], undefined, 0.08);
    chest.box(d.shoulderW * 0.7, d.torso * 0.3, d.torsoD * 0.5, m.armor, [0, d.torso * 1.02, -d.torsoD * 0.1], undefined, 0.06);
    for (let i = 0; i < 4; i++) chest.box(d.torsoW * 0.9, 0.04, 0.02, m.armorDark, [0, d.torso * (0.2 + i * 0.18), d.torsoD * 0.66]);
    chest.box(0.3, 0.4, 0.2, m.armorDark, [0, d.torso * 0.6, -d.torsoD * 0.7], undefined, 0.03);
    for (const s of ["L", "R"] as const) {
      dress.on(`shoulder${s}`).box(d.arm * 2, d.arm * 1.3, d.arm * 2, m.armor, [0, 0, 0], undefined, 0.06);
      dress.on(`elbow${s}`).box(d.arm * 1.35, d.forearm * 0.7, d.arm * 1.35, m.armor, [0, -d.forearm * 0.6, 0], undefined, 0.04);
      dress.on(`hip${s}`).box(d.leg * 1.3, d.thigh * 0.7, d.leg * 1.3, m.armor, [0, -d.thigh * 0.45, 0], undefined, 0.04);
      dress.on(`knee${s}`).box(d.leg * 1.25, d.shin * 0.65, d.leg * 1.3, m.armor, [0, -d.shin * 0.62, 0], undefined, 0.04);
    }
  } else {
    dressHead(dress, d, m, { skin, hair: "none", rotten: true }, rand);
    dressTorso(dress, d, m, { skin, shirt: null, pants: m.pants[2]!, ribs: true, belly: 0 }, rand);
    dressLimbs(dress, d, m, { skin, sleeve: null, pants: m.pants[2]!, shoes: false }, rand);
    const h = d.head;
    const head = dress.on("head");
    for (const [x, y] of [[-0.12, 0.8], [0.12, 0.8], [-0.3, 0.7], [0.3, 0.7]] as const) head.sphere(h * 0.045, m.eye, [x * h, y * h, h * 0.45], [1, 0.8, 0.6], 8);
    cone(head, h * 0.12, h * 0.6, m.bone, [-h * 0.3, h * 1.05, -h * 0.1], [-0.4, 0, 0.5]);
    cone(head, h * 0.12, h * 0.6, m.bone, [h * 0.3, h * 1.05, -h * 0.1], [-0.4, 0, -0.5]);
    const back = dress.on("spine");
    for (let i = 0; i < 7; i++) cone(back, 0.045, 0.3 - i * 0.02, m.bone, [0, d.torso * (0.15 + i * 0.13), -d.torsoD * 0.5], [-1.1, 0, 0]);
    back.box(d.torsoW * 0.62, d.torso * 0.5, 0.05, m.gore, [0, d.torso * 0.58, d.torsoD * 0.46]);
    for (const s of ["L", "R"] as const) {
      const hand = dress.on(`hand${s}`);
      for (let f = 0; f < 3; f++) cone(hand, 0.022, 0.28, m.bone, [(f - 1) * 0.05, -d.hand - 0.12, 0.05], [Math.PI - 0.3, 0, 0]);
    }
  }

  standardProxies(dress, d, 1.05);
  const weak = addWeakPoints(rig, dress, KINDS[kind].weakPoints, plan.weakRadius);
  dress.finish();
  rig.root.scale.setScalar(plan.scale);
  return { rig, weak };
}
