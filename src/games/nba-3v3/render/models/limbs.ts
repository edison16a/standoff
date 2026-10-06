import type * as THREE from "three";
import type { Influence } from "./parts";
import { smooth } from "./parts";
import { mirrorKeys, tube, type Key, type TubeOptions } from "./profile";
import type { Rig } from "./rig";

/**
 * Arms and legs as one smooth piece of skin each, from the shoulder or
 * hip to the wrist or ankle, shaped muscle by muscle: the deltoid's cap,
 * biceps in front and triceps behind, the forearm swelling below the
 * elbow and flattening to the wrist; the quads, the inner teardrop over
 * the knee, the kneecap, and the calf's two heads. Each bends smoothly
 * across its joints, weighted between the bones on either side.
 */

export type Side = 1 | -1;
const K = (side: Side) => (side > 0 ? "L" : "R");

/** Keys for the left arm, `t` down from the shoulder joint, for a two metre player of average bulk. */
function armKeys(U: number, F: number): Key[] {
  return [
    { t: -0.01, l: 0.054, r: 0.042, f: 0.05, b: 0.05 },
    { t: 0.015, l: 0.061, r: 0.044, f: 0.054, b: 0.052 },
    { t: 0.05, l: 0.062, r: 0.042, f: 0.055, b: 0.05 },
    { t: 0.1, l: 0.054, r: 0.04, f: 0.05, b: 0.049 },
    { t: 0.16, l: 0.045, r: 0.04, f: 0.055, b: 0.05 },
    { t: U - 0.12, l: 0.043, r: 0.039, f: 0.05, b: 0.047 },
    { t: U - 0.04, l: 0.039, r: 0.035, f: 0.038, b: 0.042 },
    { t: U, l: 0.038, r: 0.034, f: 0.035, b: 0.043, z: -0.003 },
    { t: U + 0.05, l: 0.046, r: 0.038, f: 0.041, b: 0.04 },
    { t: U + 0.12, l: 0.04, r: 0.034, f: 0.038, b: 0.034 },
    { t: U + F - 0.07, l: 0.028, r: 0.025, f: 0.031, b: 0.027 },
    { t: U + F - 0.01, l: 0.021, r: 0.02, f: 0.029, b: 0.026 },
    { t: U + F + 0.025, l: 0.02, r: 0.018, f: 0.026, b: 0.024 },
  ];
}

/** Keys for the left leg, `t` down from the hip joint. */
function legKeys(T: number, S: number): Key[] {
  return [
    { t: -0.06, l: 0.075, r: 0.06, f: 0.075, b: 0.085 },
    { t: 0.02, l: 0.088, r: 0.078, f: 0.085, b: 0.09 },
    { t: 0.14, l: 0.083, r: 0.074, f: 0.09, b: 0.08 },
    { t: 0.26, l: 0.073, r: 0.068, f: 0.08, b: 0.068 },
    { t: T - 0.1, l: 0.06, r: 0.066, f: 0.066, b: 0.058 },
    { t: T - 0.03, l: 0.052, r: 0.057, f: 0.058, b: 0.05 },
    { t: T + 0.02, l: 0.048, r: 0.05, f: 0.056, b: 0.046 },
    { t: T + 0.08, l: 0.05, r: 0.053, f: 0.046, b: 0.062 },
    { t: T + 0.15, l: 0.051, r: 0.057, f: 0.044, b: 0.07 },
    { t: T + 0.24, l: 0.045, r: 0.046, f: 0.04, b: 0.055 },
    { t: T + S - 0.14, l: 0.034, r: 0.034, f: 0.035, b: 0.038 },
    { t: T + S - 0.05, l: 0.03, r: 0.03, f: 0.032, b: 0.033 },
    { t: T + S + 0.02, l: 0.03, r: 0.03, f: 0.034, b: 0.036 },
  ];
}

/** The keys for one side, scaled to the player: lengths with height, girth with bulk. */
export function limbKeys(rig: Rig, kind: "arm" | "leg", side: Side): Key[] {
  const { s, bulk } = rig.m;
  const d = rig.dims;
  const raw = kind === "arm" ? armKeys(d.upper / s, d.fore / s) : legKeys(d.thigh / s, d.shin / s);
  const girth = s * bulk;
  const keys = raw.map((k) => ({ ...k, t: k.t * s, l: k.l * girth, r: k.r * girth, f: k.f * girth, b: k.b * girth, z: (k.z ?? 0) * girth }));
  return side > 0 ? keys : mirrorKeys(keys);
}

/** The bones an arm's skin follows, by how far down the arm a point sits. */
export function armInfluence(rig: Rig, side: Side): (at: THREE.Vector3) => Influence {
  const k = K(side);
  const top = rig.rest(`shoulder${k}`).y;
  const { upper, fore } = rig.dims;
  const s = rig.m.s;
  return (at) => {
    const t = top - at.y;
    const e = smooth(upper - 0.04 * s, upper + 0.035 * s, t);
    const w = smooth(upper + fore - 0.035 * s, upper + fore + 0.01 * s, t) * 0.55;
    return [[`shoulder${k}`, 1 - e], [`elbow${k}`, e * (1 - w)], [`hand${k}`, e * w]];
  };
}

/** The bones a leg's skin follows, by how far down the leg a point sits. */
export function legInfluence(rig: Rig, side: Side): (at: THREE.Vector3) => Influence {
  const k = K(side);
  const top = rig.rest(`hip${k}`).y;
  const { thigh, shin } = rig.dims;
  const s = rig.m.s;
  return (at) => {
    const t = top - at.y;
    const e = smooth(thigh - 0.045 * s, thigh + 0.04 * s, t);
    const w = smooth(thigh + shin - 0.05 * s, thigh + shin, t) * 0.5;
    return [[`hip${k}`, 1 - e], [`knee${k}`, e * (1 - w)], [`ankle${k}`, e * w]];
  };
}

/** The kneecap and the point of the elbow, pushed out a touch over the joint. */
function jointBump(at: number, front: boolean, size: number): (t: number, a: number) => number {
  return (t, a) => {
    const along = Math.exp(-(((t - at) / (size * 1.2)) ** 2));
    const round = Math.max(0, front ? Math.cos(a) : -Math.cos(a)) ** 3;
    return along * round * size * 0.25;
  };
}

/** One limb's skin, or a sleeve or sock over part of it when `inflate` and a range are given. */
export function limbTube(rig: Rig, kind: "arm" | "leg", side: Side, o: Partial<TubeOptions> & { n: number }): THREE.BufferGeometry {
  const k = K(side);
  const origin = rig.rest(kind === "arm" ? `shoulder${k}` : `hip${k}`);
  const keys = limbKeys(rig, kind, side);
  const s = rig.m.s;
  const joint = kind === "arm" ? rig.dims.upper : rig.dims.thigh;
  const bump = jointBump(joint, kind === "leg", (kind === "leg" ? 0.05 : 0.04) * s);
  return tube(origin, -1, keys, { step: 0.022 * s, bump, ...o });
}

/** The skin of both arms and both legs, closed off at the shoulder and the hip. */
export function limbs(rig: Rig, n: number): { geo: THREE.BufferGeometry; weigh: (at: THREE.Vector3) => Influence }[] {
  const s = rig.m.s;
  const out: { geo: THREE.BufferGeometry; weigh: (at: THREE.Vector3) => Influence }[] = [];
  for (const side of [1, -1] as const) {
    out.push({ geo: limbTube(rig, "arm", side, { n, capStart: 0.032 * s, capEnd: 0.012 * s }), weigh: armInfluence(rig, side) });
    out.push({ geo: limbTube(rig, "leg", side, { n, capStart: 0.04 * s, capEnd: 0.012 * s }), weigh: legInfluence(rig, side) });
  }
  return out;
}
