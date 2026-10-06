import type * as THREE from "three";
import { smooth, type Influence } from "./parts";
import { tube, type Key, type TubeOptions } from "./profile";
import type { Rig } from "./rig";

/**
 * The trunk: a rounded, squared off chest that widens from the waist to
 * the lats and shoulders, swells into the pecs, then slopes up over the
 * trapezius into the neck. The neck is its own piece into the skull.
 * The jersey is cut from the same shape a little looser.
 */

/** Keys up the torso from its joint, for a two metre player of average width. Left and right are equal. */
const TORSO: readonly Key[] = [
  { t: -0.17, l: 0.15, r: 0.15, f: 0.11, b: 0.11, power: 2.3 },
  { t: -0.04, l: 0.145, r: 0.145, f: 0.105, b: 0.106, power: 2.3 },
  { t: 0.08, l: 0.15, r: 0.15, f: 0.11, b: 0.106, power: 2.4 },
  { t: 0.2, l: 0.16, r: 0.16, f: 0.122, b: 0.112, power: 2.5 },
  { t: 0.31, l: 0.173, r: 0.173, f: 0.13, b: 0.118, power: 2.5 },
  { t: 0.39, l: 0.183, r: 0.183, f: 0.133, b: 0.12, power: 2.5 },
  { t: 0.45, l: 0.19, r: 0.19, f: 0.122, b: 0.118, power: 2.5 },
  { t: 0.5, l: 0.19, r: 0.19, f: 0.1, b: 0.11, power: 2.4 },
  { t: 0.54, l: 0.165, r: 0.165, f: 0.084, b: 0.1, power: 2.2 },
  { t: 0.575, l: 0.125, r: 0.125, f: 0.07, b: 0.088, power: 2.1 },
  { t: 0.605, l: 0.088, r: 0.088, f: 0.062, b: 0.072, power: 2 },
  { t: 0.625, l: 0.074, r: 0.074, f: 0.058, b: 0.066, power: 2 },
];

/** Keys up the neck from the neck joint. */
const NECK: readonly Key[] = [
  { t: -0.04, l: 0.086, r: 0.086, f: 0.07, b: 0.08, z: -0.004 },
  { t: 0.01, l: 0.074, r: 0.074, f: 0.064, b: 0.07, z: -0.002 },
  { t: 0.06, l: 0.067, r: 0.067, f: 0.06, b: 0.065 },
  { t: 0.12, l: 0.063, r: 0.063, f: 0.057, b: 0.064, z: 0.004 },
];

/** The torso's keys for a player: wider shoulders with `width`, a deeper chest with bulk, all scaled with height. */
export function torsoKeys(rig: Rig): Key[] {
  const { s, width, bulk } = rig.m;
  const len = rig.dims.torso / (0.57 * s);
  return TORSO.map((k) => {
    // Shoulders take the build's width; the waist only some of it.
    const wide = s * (1 + (width - 1) * smooth(0.0, 0.45, k.t));
    const deep = s * (0.92 + 0.08 * bulk) * (1 + (width - 1) * 0.4);
    return { ...k, t: k.t * s * len, l: k.l * wide, r: k.r * wide, f: k.f * deep, b: k.b * deep };
  });
}

/** The pecs: a soft swell on each side of the breastbone. */
export function pecs(rig: Rig): (t: number, a: number) => number {
  const s = rig.m.s;
  const at = 0.38 * s;
  return (t, a) => {
    const front = Math.max(0, Math.cos(a));
    const side = Math.abs(Math.sin(a));
    const across = Math.exp(-(((side - 0.42) / 0.22) ** 2));
    const along = Math.exp(-(((t - at) / (0.07 * s)) ** 2));
    // A gentle line down the middle where the two meet.
    const groove = Math.exp(-((side / 0.06) ** 2)) * 0.25;
    return 0.014 * s * rig.m.bulk * front * along * (across - groove);
  };
}

/** The bones the trunk follows: the pelvis low down, the torso above, and the rib cage breathing in between. */
export function torsoInfluence(rig: Rig): (at: THREE.Vector3) => Influence {
  const base = rig.rest("torso").y;
  const s = rig.m.s;
  const neckY = rig.rest("neck").y;
  return (at) => {
    const t = at.y - base;
    const up = smooth(-0.06 * s, 0.2 * s, t);
    const ribs = Math.exp(-(((t - 0.36 * s) / (0.13 * s)) ** 2)) * 0.75;
    const neck = smooth(neckY - 0.015 * s, neckY + 0.04 * s, at.y) * 0.6;
    return [["hips", 1 - up], ["torso", up * (1 - ribs) * (1 - neck)], ["chest", up * ribs * (1 - neck)], ["neck", up * neck]];
  };
}

export function neckInfluence(rig: Rig): (at: THREE.Vector3) => Influence {
  const base = rig.rest("neck").y;
  const s = rig.m.s;
  return (at) => {
    const k = smooth(-0.02 * s, 0.06 * s, at.y - base);
    return [["torso", 1 - k], ["neck", k]];
  };
}

/** The trunk's skin, from inside the shorts up to the neck. */
export function torsoTube(rig: Rig, o: Partial<TubeOptions> & { n: number }): THREE.BufferGeometry {
  return tube(rig.rest("torso"), 1, torsoKeys(rig), { step: 0.03 * rig.m.s, bump: pecs(rig), ...o });
}

/** The neck, from inside the trapezius up into the skull. */
export function neckTube(rig: Rig, n: number): THREE.BufferGeometry {
  const s = rig.m.s;
  const keys = NECK.map((k) => ({ ...k, t: k.t * s, l: k.l * s, r: k.r * s, f: k.f * s, b: k.b * s, z: (k.z ?? 0) * s }));
  return tube(rig.rest("neck"), 1, keys, { n, step: 0.025 * s, capStart: 0.02 * s, capEnd: 0.02 * s });
}
