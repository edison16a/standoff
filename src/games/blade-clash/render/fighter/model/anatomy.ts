import type * as THREE from "three";
import type { MeshBuilder } from "../../kit/mesh-builder";
import { BODY } from "../rig/skeleton";

type Mat = THREE.Material;

/**
 * The body under the armour, built from smooth turned profiles: a torso
 * that swells at the chest and narrows at the waist, limbs that bulge
 * and taper to the joints, fists round the grip and boots. Every piece is
 * modelled in its bone's own axes (see the rig): limbs hang down -y from
 * their joint, fronts face +x and the sword side is +z.
 */

/** Profile of a limb hanging from its joint: a rounded top, a bulge, a rounded bottom. */
export function limbProfile(length: number, top: number, bulge: number, bottom: number, bulgeAt = 0.3): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    points.push([top * Math.sin(a), top * 0.55 * Math.cos(a)]);
  }
  for (let k = 1; k <= 12; k++) {
    const t = k / 12;
    const r = t < bulgeAt ? mix(top, bulge, ease(t / bulgeAt)) : mix(bulge, bottom, ease((t - bulgeAt) / (1 - bulgeAt)));
    points.push([r, -t * length]);
  }
  for (let i = 1; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    points.push([bottom * Math.cos(a), -length - bottom * 0.55 * Math.sin(a)]);
  }
  // Lathe faces point outward when the profile runs bottom to top.
  return points.reverse();
}

export interface LimbSpec {
  top: number;
  bulge: number;
  bottom: number;
  bulgeAt?: number;
  /** Front to back squash. */
  depth?: number;
}

export const ARM = { upper: { top: 0.055, bulge: 0.057, bottom: 0.043, bulgeAt: 0.25 }, fore: { top: 0.046, bulge: 0.049, bottom: 0.032, bulgeAt: 0.22 } };
export const LEG = { thigh: { top: 0.088, bulge: 0.09, bottom: 0.058, bulgeAt: 0.2, depth: 0.95 }, shin: { top: 0.058, bulge: 0.062, bottom: 0.038, bulgeAt: 0.28 } };

export function limb(b: MeshBuilder, length: number, spec: LimbSpec, material: Mat, swell = 1): void {
  b.lathe(limbProfile(length, spec.top * swell, spec.bulge * swell, spec.bottom * swell, spec.bulgeAt), material, [0, 0, 0], [spec.depth ?? 1, 1, 1], 18);
}

/** A turned torso from the pelvis joint to the neck, as (radius, height), scaled wider than deep so it reads as a chest. */
export const TORSO_PROFILE: [number, number][] = [
  [0, -0.06], [0.12, -0.05], [0.13, 0.02], [0.122, 0.11], [0.138, 0.185], [0.162, 0.26], [0.178, 0.33],
  [0.178, 0.385], [0.165, 0.425], [0.122, 0.458], [0.075, 0.482], [0.05, 0.496], [0, 0.505],
];
export const TORSO_SCALE = { depth: 0.76, width: 1.16 };

export function torso(b: MeshBuilder, material: Mat, swell = 1): void {
  b.lathe(TORSO_PROFILE.map(([r, y]) => [r * swell, y] as [number, number]), material, [0, 0, 0], [TORSO_SCALE.depth, 1, TORSO_SCALE.width], 28);
  // Rounded shoulders over each joint, and the slope up to the neck.
  for (const side of [-1, 1]) {
    b.sphere(0.068 * swell, material, [0, BODY.torso - BODY.shoulderDrop + 0.005, side * BODY.shoulderWidth * 0.47], [0.95, 0.9, 1], 16);
    b.sphere(0.075 * swell, material, [-0.01, BODY.torso - 0.035, side * 0.095], [0.9, 0.5, 1.2], 14);
  }
}

/** The pelvis and seat, under whatever covers it. */
export function pelvis(b: MeshBuilder, material: Mat, swell = 1): void {
  b.sphere(0.15 * swell, material, [-0.005, -0.03, 0], [0.78, 0.62, 1.05], 22);
  for (const side of [-1, 1]) b.sphere(0.09 * swell, material, [-0.01, -0.07, (side * BODY.hipWidth) / 2], [1, 1, 1], 14);
}

/** The neck, from the top of the chest up into the head. */
export function neck(b: MeshBuilder, material: Mat): void {
  b.cylinder(0.052, 0.058, 0.13, material, [0, 0.03, 0], [0, 0, 0], 14);
}

/**
 * A fist closed round a grip running along +x through its middle, thumb
 * on top (+y). The back of the hand faces +z for the sword hand; `side`
 * -1 mirrors it for the free hand, whose back faces the other way.
 */
export function fist(b: MeshBuilder, glove: Mat, side: 1 | -1 = 1, size = 1): void {
  const s = size;
  const z = side * s;
  b.box(0.09 * s, 0.07 * s, 0.075 * s, glove, [0, -0.006 * s, 0], [0, 0, 0], 0.026 * s);
  // Four knuckles along the back of the hand, and the thumb along the top.
  for (let i = 0; i < 4; i++) b.sphere(0.018 * s, glove, [(-0.032 + i * 0.021) * s, -0.028 * s, 0.03 * z], [1, 1, 1], 8);
  b.rod([-0.03 * s, 0.03 * s, 0.018 * z], [0.03 * s, 0.034 * s, 0.01 * z], 0.014 * s, glove, 8);
  // The heel of the hand, where the wrist comes in.
  b.sphere(0.04 * s, glove, [-0.012 * s, -0.022 * s, -0.018 * z], [1, 0.9, 1], 12);
}

/** A boot, in foot space: ankle at the origin, sole on the floor, toes along +x. */
export function boot(b: MeshBuilder, upper: Mat, sole: Mat, bulk = 1): void {
  const floor = -BODY.ankle;
  b.box(0.28 * bulk, 0.024, 0.1 * bulk, sole, [0.07, floor + 0.012, 0], [0, 0, 0], 0.01);
  b.sphere(0.062 * bulk, upper, [0.1, floor + 0.046, 0], [1.75, 0.72, 0.82], 16);
  b.sphere(0.054 * bulk, upper, [-0.02, floor + 0.052, 0], [1.05, 1.1, 0.92], 14);
  b.cylinder(0.046 * bulk, 0.052 * bulk, 0.1, upper, [0.005, floor + 0.09, 0], [0, 0, 0], 14);
}

/** The torso's radius at height `y` along its profile, before the width and depth scale. */
export function torsoRadius(y: number): number {
  for (let i = 1; i < TORSO_PROFILE.length; i++) {
    const [r0, y0] = TORSO_PROFILE[i - 1]!;
    const [r1, y1] = TORSO_PROFILE[i]!;
    if (y <= y1) return y1 === y0 ? r1 : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}

/**
 * A point on the torso's surface at height `y` and `angle` round from the
 * front (0) toward the sword side (a quarter turn), lifted `lift` off it.
 * Emblems, straps and lacing are laid on the body with this.
 */
export function onTorso(y: number, angle: number, swell = 1, lift = 0.004): [number, number, number] {
  const r = torsoRadius(y) * swell;
  return [(r * TORSO_SCALE.depth + lift) * Math.cos(angle), y, (r * TORSO_SCALE.width + lift) * Math.sin(angle)];
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function ease(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}
