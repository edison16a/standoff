import * as THREE from "three";
import { ATLAS } from "./kit-texture";
import { armInfluence, legInfluence, limbTube } from "./limbs";
import type { PartList } from "./parts";
import { smooth } from "./parts";
import { mirrorKeys, tube, type Key } from "./profile";
import type { Rig } from "./rig";
import { pecs, torsoInfluence, torsoKeys } from "./torso";

/**
 * The kit's cloth: a jersey cut from the torso's own shape a little
 * looser, hanging straight from the chest instead of hugging the waist,
 * and baggy shorts whose legs follow the thighs through the sway bones,
 * swinging after them. The referee's version adds short sleeves and
 * full length trousers.
 */

/** Maps a piece's own v (0 to 1 along it) into a band of the kit texture. */
function band(geo: THREE.BufferGeometry, from: number, to: number): THREE.BufferGeometry {
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, from + (to - from) * uv.getY(i));
  uv.needsUpdate = true;
  return geo;
}

function jersey(rig: Rig, n: number): THREE.BufferGeometry {
  const s = rig.m.s;
  // Below the chest the shirt falls straight rather than following the waist in.
  const loose = (k: Key): Key => {
    const fall = 1 - smooth(0.3 * s, 0.4 * s, k.t);
    const floor = (v: number, min: number) => v + Math.max(0, min - v) * fall;
    return { ...k, l: floor(k.l, 0.176 * s * rig.m.width), r: floor(k.r, 0.176 * s * rig.m.width), f: floor(k.f, 0.13 * s), b: floor(k.b, 0.12 * s) };
  };
  const keys = torsoKeys(rig).map(loose);
  const geo = tube(rig.rest("torso"), 1, keys, { n, step: 0.024 * s, from: -0.03 * s, to: 0.615 * s, inflate: 0.008 * s, bump: pecs(rig), a0: Math.PI / 2 });
  return band(geo, ATLAS.jersey[0], ATLAS.jersey[1]);
}

/** The seat of the shorts, from the waistband down to the crotch, round both hips. */
function shortsSeat(rig: Rig, n: number): THREE.BufferGeometry {
  const { s, width, bulk } = rig.m;
  const w = s * width;
  const d = s * (0.9 + 0.1 * bulk);
  const keys: Key[] = [
    { t: -0.13 * s, l: 0.2 * w, r: 0.2 * w, f: 0.128 * d, b: 0.138 * d, power: 2.3 },
    { t: -0.06 * s, l: 0.21 * w, r: 0.21 * w, f: 0.134 * d, b: 0.152 * d, power: 2.3 },
    { t: 0.03 * s, l: 0.216 * w, r: 0.216 * w, f: 0.134 * d, b: 0.15 * d, power: 2.4 },
    { t: 0.12 * s, l: 0.205 * w, r: 0.205 * w, f: 0.124 * d, b: 0.14 * d, power: 2.3 },
    { t: 0.17 * s, l: 0.17 * w, r: 0.17 * w, f: 0.1 * d, b: 0.11 * d, power: 2.2 },
  ];
  const geo = tube(rig.rest("hips"), -1, keys, { n, step: 0.03 * s, capEnd: 0.035 * s });
  return band(geo, ATLAS.shortsTop[1], ATLAS.shortsTop[0]);
}

/** One leg of the shorts, hanging from the hip to above the knee, or to the ankle as trousers. */
function shortsLeg(rig: Rig, side: 1 | -1, n: number, long: boolean): THREE.BufferGeometry {
  const { s, bulk } = rig.m;
  const g = s * (0.9 + 0.1 * bulk);
  const hem = long ? rig.dims.thigh + rig.dims.shin - 0.03 * s : rig.dims.thigh * 0.7;
  // Built for the left leg, outside on +x, and mirrored for the right.
  const key = (t: number, o: number, i: number, f: number, b: number): Key => ({ t, l: o * g, r: i * g, f: f * g, b: b * g });
  const left: Key[] = long
    ? [key(-0.02 * s, 0.112, 0.096, 0.112, 0.118), key(0.3 * s, 0.085, 0.08, 0.088, 0.085), key(rig.dims.thigh, 0.068, 0.066, 0.07, 0.068), key(hem, 0.058, 0.056, 0.058, 0.06)]
    : [key(-0.02 * s, 0.116, 0.11, 0.115, 0.12), key(0.15 * s, 0.113, 0.106, 0.112, 0.116), key(hem, 0.112, 0.102, 0.11, 0.114)];
  const geo = tube(rig.rest(side > 0 ? "hipL" : "hipR"), -1, side > 0 ? left : mirrorKeys(left), { n, step: 0.03 * s });
  return band(geo, ATLAS.shortsLegs[1], ATLAS.shortsLegs[0]);
}

export interface KitOptions {
  referee?: boolean;
  fine: boolean;
}

/** Adds the jersey and shorts (or the referee's shirt and trousers) to the kit's part list. */
export function addKit(parts: PartList, rig: Rig, o: KitOptions): void {
  const n = o.fine ? 40 : 20;
  const s = rig.m.s;
  parts.weighted(jersey(rig, n), torsoInfluence(rig), 0.62);
  parts.weighted(shortsSeat(rig, n), () => [["hips", 1]], 0.6);
  for (const side of [1, -1] as const) {
    const cloth = side > 0 ? "clothL" : "clothR";
    if (o.referee) {
      parts.weighted(shortsLeg(rig, side, n / 2, true), legInfluence(rig, side), 0.75);
      const sleeve = limbTube(rig, "arm", side, { n: n / 2, from: -0.03 * s, to: 0.15 * s, inflate: 0.012 * s, capStart: 0.03 * s });
      parts.weighted(band(sleeve, 0.5, 0.56), armInfluence(rig, side), 0.62);
      continue;
    }
    const top = rig.rest("hips").y;
    parts.weighted(shortsLeg(rig, side, n / 2, false), (at) => {
      const k = smooth(0.0, 0.25 * s, top - at.y) * 0.92;
      return [["hips", 1 - k], [cloth, k]];
    }, 0.6);
  }
}
