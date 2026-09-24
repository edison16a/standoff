import * as THREE from "three";
import type { MeshBuilder } from "../kit/mesh-builder";
import { BODY } from "./body-rig";
import type { Dresser } from "./dresser";

type Mat = THREE.Material;

/**
 * The human underneath every costume, built from smooth turned profiles
 * rather than boxes: a torso that swells at the chest and pinches at the
 * waist, limbs that bulge at the calf and forearm and narrow at the joints,
 * rounded shoulders, gloved fists and shoes. Characters swap the cloth.
 */

/** Profile of a limb hanging down from its joint: top cap, bulge, bottom cap. Closed at both ends. */
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

export function limb(b: MeshBuilder, length: number, spec: LimbSpec, material: Mat, from = 0): void {
  b.lathe(limbProfile(length, spec.top, spec.bulge, spec.bottom, spec.bulgeAt), material, [0, -from, 0], [spec.depth ?? 1, 1, 1], 18);
}

export const ARM = { upper: { top: 0.052, bulge: 0.054, bottom: 0.041, bulgeAt: 0.25 }, fore: { top: 0.043, bulge: 0.046, bottom: 0.03, bulgeAt: 0.22 } };
export const LEG = { thigh: { top: 0.085, bulge: 0.088, bottom: 0.056, bulgeAt: 0.2, depth: 0.95 }, shin: { top: 0.056, bulge: 0.06, bottom: 0.036, bulgeAt: 0.28, depth: 1 } };

/**
 * A turned torso profile from the pelvis to the neck, as (radius, height).
 * Scaled wider than deep, it reads as a chest rather than a barrel.
 */
export const TORSO_PROFILE: [number, number][] = [
  [0, -0.06], [0.12, -0.05], [0.13, 0.02], [0.122, 0.12], [0.138, 0.2], [0.162, 0.28], [0.178, 0.36],
  [0.178, 0.42], [0.165, 0.46], [0.122, 0.495], [0.075, 0.52], [0.05, 0.535], [0, 0.54],
];
/** Depth and width of the torso against its turned profile. */
export const TORSO_SCALE = { depth: 0.76, width: 1.16 };

export function torso(b: MeshBuilder, material: Mat, swell = 1, profile = TORSO_PROFILE): void {
  b.lathe(profile.map(([r, y]) => [r * swell, y] as [number, number]), material, [0, 0, 0], [TORSO_SCALE.depth, 1, TORSO_SCALE.width], 28);
  // Shoulders: rounded caps over each joint, and the slope up to the neck.
  for (const side of [-1, 1]) {
    b.sphere(0.066 * swell, material, [0, BODY.torso - BODY.shoulderDrop + 0.005, side * BODY.shoulderWidth * 0.47], [0.95, 0.9, 1], 16);
    b.sphere(0.075 * swell, material, [-0.01, BODY.torso - 0.035, side * 0.095], [0.9, 0.5, 1.2], 14);
  }
}

/** The pelvis and seat, under whatever covers it. */
export function pelvis(b: MeshBuilder, material: Mat, swell = 1): void {
  b.sphere(0.15 * swell, material, [-0.005, -0.03, 0], [0.78, 0.62, 1.05], 22);
  for (const side of [-1, 1]) b.sphere(0.09 * swell, material, [-0.01, -0.07, side * BODY.hipWidth / 2], [1, 1, 1], 14);
}

/** A gloved fist closed round the grip, which runs along +x through the palm. */
export function fist(b: MeshBuilder, glove: Mat): void {
  b.box(0.088, 0.066, 0.07, glove, [0.05, -0.004, 0], [0, 0, 0], 0.026);
  // The four knuckles curl under the grip, the thumb lies along it on top.
  for (let i = 0; i < 4; i++) b.sphere(0.017, glove, [0.02 + i * 0.021, -0.036, 0.02], [1, 1, 1], 8);
  b.rod([0.025, 0.028, 0.028], [0.085, 0.03, 0.012], 0.014, glove, 8);
  b.sphere(0.015, glove, [0.086, 0.03, 0.012], [1, 1, 1], 8);
  b.sphere(0.036, glove, [0.0, 0, 0], [1, 0.85, 0.95], 12);
}

/** An open hand hanging from the wrist, fingers a little curled. */
export function openHand(b: MeshBuilder, material: Mat): void {
  b.box(0.036, 0.09, 0.082, material, [0.004, -0.048, 0], [0, 0, 0], 0.016);
  // The fingers together, a little curled, and the thumb apart.
  b.box(0.03, 0.07, 0.078, material, [0.014, -0.118, 0], [0, 0, 0.35], 0.014);
  b.rod([0.014, -0.03, 0.038], [0.036, -0.078, 0.05], 0.012, material, 8);
  b.sphere(0.032, material, [0, 0, 0], [0.8, 0.8, 1], 10);
}

/** A shoe or boot foot: sole, toe box and heel, in foot space (toes along +x, sole at the floor). */
export function shoe(b: MeshBuilder, upper: Mat, sole: Mat): void {
  const floor = -BODY.ankle;
  b.box(0.275, 0.022, 0.098, sole, [0.07, floor + 0.011, 0], [0, 0, 0], 0.01);
  b.sphere(0.06, upper, [0.1, floor + 0.045, 0], [1.75, 0.72, 0.8], 16);
  b.sphere(0.052, upper, [-0.02, floor + 0.05, 0], [1.05, 1.1, 0.9], 14);
  b.cylinder(0.044, 0.05, 0.07, upper, [0.005, floor + 0.075, 0], [0, 0, 0], 14);
}

export interface FaceStyle {
  skin: Mat;
  brow: Mat;
  /** The iris. The whites are a shared soft white. */
  eye: Mat;
  white?: Mat;
  lips?: Mat;
}

/**
 * A face, turned toward +x: skull, jaw, nose, brow, ears and eyes. Kept
 * simple and a touch stylised, because at the camera's distance a bold
 * shape reads and fine detail only flickers.
 */
export function face(b: MeshBuilder, style: FaceStyle): void {
  const { skin } = style;
  b.cylinder(0.05, 0.056, 0.12, skin, [0, 0.03, 0], [0, 0, 0], 14);
  b.sphere(0.1, skin, [0, 0.19, 0], [1.02, 1.12, 0.9], 22);
  b.sphere(0.068, skin, [0.045, 0.125, 0], [1, 0.85, 0.95], 16);
  b.sphere(0.022, skin, [0.1, 0.165, 0], [1.2, 1.1, 0.8], 10);
  for (const side of [-1, 1]) {
    b.sphere(0.022, skin, [0.0, 0.18, side * 0.093], [0.7, 1.2, 0.5], 10);
    if (style.white) b.sphere(0.015, style.white, [0.087, 0.197, side * 0.034], [0.8, 0.85, 1], 10);
    b.sphere(0.009, style.eye, [0.1, 0.197, side * 0.034], [0.6, 1, 1], 8);
    b.box(0.018, 0.009, 0.042, style.brow, [0.096, 0.222, side * 0.037], [side * 0.12, 0, side * -0.12], 0.004);
  }
  if (style.lips) b.box(0.014, 0.01, 0.038, style.lips, [0.096, 0.118, 0], [0, 0, 0], 0.005);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function ease(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}

/** Paints the standard body on a dresser: torso, pelvis, both arms and legs. Characters then add on top. */
export interface BodyCloth {
  top: Mat;
  sleeve: Mat;
  forearm?: Mat;
  glove: Mat;
  freeHand: Mat;
  seat: Mat;
  thigh: Mat;
  shin: Mat;
  shoe: Mat;
  sole: Mat;
  /** Chest scale, a little over 1 for bulkier characters. */
  swell?: number;
}

export function dressBody(d: Dresser, cloth: BodyCloth): void {
  const swell = cloth.swell ?? 1;
  torso(d.on("chest"), cloth.top, swell);
  pelvis(d.on("pelvis"), cloth.seat, swell);
  for (const side of ["F", "B"] as const) {
    limb(d.on(`upperArm${side}`), BODY.upperArm, scaled(ARM.upper, swell), cloth.sleeve);
    limb(d.on(`forearm${side}`), BODY.forearm, scaled(ARM.fore, swell), cloth.forearm ?? cloth.sleeve);
    d.on(`upperArm${side}`).sphere(0.047 * swell, cloth.sleeve, [0, -BODY.upperArm, 0], [1, 1, 1], 12);
    limb(d.on(`thigh${side}`), BODY.thigh, LEG.thigh, cloth.thigh);
    limb(d.on(`shin${side}`), BODY.shin, LEG.shin, cloth.shin);
    d.on(`thigh${side}`).sphere(0.058, cloth.thigh, [0.004, -BODY.thigh, 0], [1, 1, 1], 12);
    shoe(d.on(`foot${side}`), cloth.shoe, cloth.sole);
  }
  fist(d.on("handF"), cloth.glove);
  openHand(d.on("handB"), cloth.freeHand);
}

function scaled(spec: LimbSpec, k: number): LimbSpec {
  return { ...spec, top: spec.top * k, bulge: spec.bulge * k, bottom: spec.bottom * k };
}

/** The torso's radius at height `y` along its profile, before the width and depth scale. */
export function torsoRadius(y: number, profile = TORSO_PROFILE): number {
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1]!;
    const [r1, y1] = profile[i]!;
    if (y <= y1) return y1 === y0 ? r1 : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}

/**
 * A point on the torso's surface, at height `y` and `angle` round from the
 * front (0) toward the sword side (a quarter turn), lifted `lift` off it.
 * Buttons, stripes and straps are laid on the body with this.
 */
export function onTorso(y: number, angle: number, swell = 1, lift = 0.004): [number, number, number] {
  const r = torsoRadius(y) * swell;
  return [(r * TORSO_SCALE.depth + lift) * Math.cos(angle), y, (r * TORSO_SCALE.width + lift) * Math.sin(angle)];
}
