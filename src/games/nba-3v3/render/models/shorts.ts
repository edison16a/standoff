import * as THREE from "three";
import { loft, ringY, type Section } from "./loft";
import { smooth } from "./parts";
import type { Rig } from "./rig";

/**
 * Baggy shorts as two legs that meet down the middle. Each leg's section
 * is a D: round on the outside, flat where it meets the other leg, so
 * above the crotch the two read as one garment with a seam down the
 * front and back. Below the crotch the flat side rounds off and the
 * legs part. `t` runs down from the hip joints.
 */

interface Station {
  t: number;
  /** How far the outside of the leg reaches past the hip joint. */
  out: number;
  /** How far the inside reaches toward the middle, past which it would cross the other leg. */
  inner: number;
  front: number;
  back: number;
  /** How square the inside is: high for a flat seam, 2 once the legs part. */
  flat: number;
}

/** A D shaped section: the outside a rounded oval, the inside squared off by `flat`. */
function dShape(st: Station, side: 1 | -1): Section {
  return (a) => {
    const s = Math.sin(a);
    const c = Math.cos(a);
    const outward = s * side > 0;
    const e = 2 / (outward ? 2.2 : st.flat);
    const r = outward ? st.out : st.inner;
    const x = Math.sign(s) * Math.abs(s) ** e * r;
    const z = Math.sign(c) * Math.abs(c) ** e * (c >= 0 ? st.front : st.back);
    return [x, z];
  };
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** The stations for the left leg of a player, from the waistband to the hem. */
function stations(rig: Rig): Station[] {
  const { s, width, bulk, hipX } = rig.m;
  const w = s * width;
  const d = s * (0.9 + 0.1 * bulk);
  const hem = rig.dims.thigh * 0.7;
  const crotch = 0.19 * s;
  const raw: [number, number, number, number][] = [
    [-0.13 * s, 0.184 * w, 0.138 * d, 0.146 * d],
    [-0.06 * s, 0.196 * w, 0.14 * d, 0.155 * d],
    [0.02 * s, 0.205 * w, 0.136 * d, 0.15 * d],
    [0.1 * s, 0.214 * w, 0.13 * d, 0.14 * d],
    [crotch, 0.218 * w, 0.122 * d, 0.13 * d],
    [crotch + 0.06 * s, 0.218 * w, 0.118 * d, 0.122 * d],
    [hem, 0.219 * w, 0.113 * d, 0.116 * d],
  ];
  return raw.map(([t, edge, front, back]) => {
    // The legs part below the crotch: the inside pulls back from the middle and rounds off.
    const part = smooth(crotch - 0.01 * s, hem, t);
    return { t, out: edge - hipX, inner: hipX - part * 0.012 * s, front, back, flat: lerp(7, 2.2, smooth(crotch - 0.02 * s, crotch + 0.07 * s, t)) };
  });
}

function stationAt(list: Station[], t: number): Station {
  let k = 0;
  while (k < list.length - 2 && list[k + 1]!.t < t) k++;
  const a = list[k]!;
  const b = list[k + 1]!;
  const u = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
  const v = u * u * (3 - 2 * u);
  return { t, out: lerp(a.out, b.out, v), inner: lerp(a.inner, b.inner, v), front: lerp(a.front, b.front, v), back: lerp(a.back, b.back, v), flat: lerp(a.flat, b.flat, u) };
}

/** One leg of the shorts, `n` points round, from the waistband to the hem. */
export function shortsLeg(rig: Rig, side: 1 | -1, n: number): THREE.BufferGeometry {
  const list = stations(rig);
  const origin = rig.rest(side > 0 ? "hipL" : "hipR");
  const from = list[0]!.t;
  const to = list[list.length - 1]!.t;
  const rows = Math.ceil((to - from) / (0.03 * rig.m.s));
  const rings: THREE.Vector3[][] = [];
  for (let i = 0; i <= rows; i++) {
    const t = from + ((to - from) * i) / rows;
    rings.push(ringY(origin.x, origin.y - t, origin.z, n, dShape(stationAt(list, t), side)));
  }
  return loft(rings);
}
