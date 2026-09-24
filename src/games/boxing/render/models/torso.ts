import * as THREE from "three";
import type { BoxerMaterials } from "./materials";
import { sculpt, type Bump, type Ring } from "./sculpt";

/**
 * The trunk in three pieces that bend against each other: the chest on
 * the chest joint, the belly on the spine joint and the trunks on the
 * hips. Each overlaps the next so a twist or a lean never opens a gap.
 * Widths scale with the boxer's bulk.
 */

function widen(rings: readonly Ring[], bulk: number): Ring[] {
  return rings.map((r) => ({ ...r, rx: r.rx * bulk, zf: r.zf * (0.5 + bulk / 2), zb: r.zb * (0.5 + bulk / 2) }));
}

/** Chest joint at the bottom of the ribs. From the base of the neck, over the traps and pecs, down to the waist. */
const CHEST: readonly Ring[] = [
  { t: 0, y: 0.35, rx: 0.06, zf: 0.05, zb: 0.058, z: -0.01 },
  { t: 0.08, y: 0.33, rx: 0.13, zf: 0.07, zb: 0.085, z: -0.012 },
  { t: 0.18, y: 0.29, rx: 0.195, zf: 0.1, zb: 0.098, z: -0.01 },
  { t: 0.32, y: 0.22, rx: 0.2, zf: 0.126, zb: 0.108 },
  { t: 0.5, y: 0.14, rx: 0.19, zf: 0.122, zb: 0.108 },
  { t: 0.7, y: 0.05, rx: 0.165, zf: 0.112, zb: 0.1 },
  { t: 0.86, y: -0.02, rx: 0.152, zf: 0.104, zb: 0.094 },
  { t: 1, y: -0.08, rx: 0.148, zf: 0.1, zb: 0.09 },
];

const CHEST_MUSCLE: readonly Bump[] = [
  // Pecs, with the breastbone between them.
  { theta: 0.52, t: 0.33, width: 0.42, height: 0.11, amount: 0.024, mirror: true },
  { theta: 0, t: 0.38, width: 0.1, height: 0.16, amount: -0.009 },
  // Serratus down the sides and the lats flaring under the arms.
  { theta: 1.25, t: 0.52, width: 0.25, height: 0.14, amount: 0.012, mirror: true },
  // Shoulder blades and the groove of the spine.
  { theta: Math.PI - 0.62, t: 0.34, width: 0.35, height: 0.12, amount: 0.017, mirror: true },
  { theta: Math.PI, t: 0.55, width: 0.1, height: 0.45, amount: -0.012 },
  // Traps rising to the neck.
  { theta: Math.PI - 0.5, t: 0.11, width: 0.5, height: 0.07, amount: 0.012, mirror: true },
];

/** Spine joint just above the belt. The belly, from under the pecs into the waistband. */
const BELLY: readonly Ring[] = [
  { t: 0, y: 0.24, rx: 0.15, zf: 0.1, zb: 0.09 },
  { t: 0.3, y: 0.14, rx: 0.144, zf: 0.1, zb: 0.088 },
  { t: 0.6, y: 0.04, rx: 0.146, zf: 0.098, zb: 0.09 },
  { t: 0.85, y: -0.03, rx: 0.152, zf: 0.1, zb: 0.096 },
  { t: 1, y: -0.07, rx: 0.156, zf: 0.1, zb: 0.1 },
];

const ABS: readonly Bump[] = [
  { theta: 0.17, t: 0.18, width: 0.13, height: 0.08, amount: 0.009, mirror: true },
  { theta: 0.17, t: 0.42, width: 0.13, height: 0.08, amount: 0.009, mirror: true },
  { theta: 0.17, t: 0.66, width: 0.13, height: 0.08, amount: 0.008, mirror: true },
  { theta: 0, t: 0.45, width: 0.05, height: 0.4, amount: -0.005 },
  { theta: 1.05, t: 0.55, width: 0.28, height: 0.2, amount: 0.008, mirror: true },
  { theta: Math.PI, t: 0.4, width: 0.12, height: 0.5, amount: -0.01 },
];

/** Hips joint. High waisted satin trunks, from the waistband to the top of the thighs. */
const TRUNKS: readonly Ring[] = [
  { t: 0, y: 0.17, rx: 0.165, zf: 0.108, zb: 0.108 },
  { t: 0.35, y: 0.06, rx: 0.175, zf: 0.112, zb: 0.12 },
  { t: 0.7, y: -0.04, rx: 0.18, zf: 0.11, zb: 0.125 },
  { t: 1, y: -0.1, rx: 0.1, zf: 0.07, zb: 0.08 },
];

const NECK: readonly Ring[] = [
  { t: 0, y: 0.15, rx: 0.052, zf: 0.05, zb: 0.052 },
  { t: 0.5, y: 0.06, rx: 0.058, zf: 0.055, zb: 0.058 },
  { t: 1, y: -0.04, rx: 0.075, zf: 0.06, zb: 0.07 },
];

export function buildChest(m: BoxerMaterials): THREE.Mesh {
  return new THREE.Mesh(sculpt(widen(CHEST, m.look.bulk), { rows: 28, segments: 40, bumps: CHEST_MUSCLE }), m.skin);
}

export function buildBelly(m: BoxerMaterials): THREE.Mesh {
  return new THREE.Mesh(sculpt(widen(BELLY, m.look.bulk), { rows: 18, segments: 36, bumps: ABS }), m.skin);
}

export function buildNeck(m: BoxerMaterials): THREE.Mesh {
  const bumps: Bump[] = [{ theta: 0.55, t: 0.45, width: 0.3, height: 0.3, amount: 0.006, mirror: true }];
  return new THREE.Mesh(sculpt(NECK, { rows: 8, segments: 24, bumps }), m.skin);
}

/** The trunks' body and their waistband, which carries the boxer's nickname. */
export function buildTrunks(m: BoxerMaterials): THREE.Group {
  const group = new THREE.Group();
  const bulk = m.look.bulk;
  group.add(new THREE.Mesh(sculpt(widen(TRUNKS, bulk), { rows: 12, segments: 40 }), m.trunks));
  const band = sculpt(
    widen(
      [
        { t: 0, y: 0.24, rx: 0.162, zf: 0.108, zb: 0.1 },
        { t: 0.5, y: 0.2, rx: 0.172, zf: 0.114, zb: 0.108 },
        { t: 1, y: 0.15, rx: 0.172, zf: 0.114, zb: 0.112 },
      ],
      bulk,
    ),
    { rows: 4, segments: 48 },
  );
  group.add(new THREE.Mesh(band, m.waistband));
  return group;
}
