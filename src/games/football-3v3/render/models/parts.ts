import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Paint } from "./loft";
import { boneIndex, type BoneName } from "./rig";

/**
 * Parts of a skinned player. Every part carries the same attributes
 * (position, normal, uv, colour, roughness and skin weights) so a whole
 * material's worth of parts merges into one geometry and draws at once.
 */

export type V3 = readonly [number, number, number];

export interface Place {
  at?: V3;
  /** Euler angles in radians, applied X then Y then Z. */
  rot?: V3;
  scale?: V3 | number;
}

const matrix = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const colour = new THREE.Color();

/** Moves a primitive into place and paints it one colour and roughness. Consumes `geo`. */
export function dress(geo: THREE.BufferGeometry, paint: Paint, place: Place = {}): THREE.BufferGeometry {
  const g = geo.index ? geo : indexed(geo);
  for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
  const s = place.scale ?? 1;
  const size = typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  quat.setFromEuler(euler.set(...(place.rot ?? [0, 0, 0])));
  matrix.compose(new THREE.Vector3(...(place.at ?? [0, 0, 0])), quat, size);
  g.applyMatrix4(matrix);
  const count = g.getAttribute("position").count;
  if (!g.getAttribute("uv")) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  colour.set(paint.colour);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) col.set([colour.r, colour.g, colour.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("rough", new THREE.BufferAttribute(new Float32Array(count).fill(paint.rough), 1));
  return g;
}

function indexed(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const count = geo.getAttribute("position").count;
  geo.setIndex(Array.from({ length: count }, (_, i) => i));
  return geo;
}

/** Up to four bones and how much each moves a vertex. */
export type Weights = readonly (readonly [BoneName, number])[];

const p = new THREE.Vector3();

/** Gives every vertex its bones, from where it sits at rest. Weights are normalised. */
export function weigh(geo: THREE.BufferGeometry, of: (at: THREE.Vector3) => Weights): THREE.BufferGeometry {
  const pos = geo.getAttribute("position");
  const idx = new Uint16Array(pos.count * 4);
  const wts = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const w = of(p.fromBufferAttribute(pos, i)).filter(([, v]) => v > 1e-4).slice(0, 4);
    const total = w.reduce((s, [, v]) => s + v, 0) || 1;
    w.forEach(([name, v], k) => {
      idx[i * 4 + k] = boneIndex(name);
      wts[i * 4 + k] = v / total;
    });
    if (w.length === 0) wts[i * 4] = 1;
  }
  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute("skinWeight", new THREE.BufferAttribute(wts, 4));
  return geo;
}

/** Every vertex on one bone. */
export const rigid = (bone: BoneName) => (): Weights => [[bone, 1]];

/** 0 at `a`, 1 at `b`, eased between. */
export function ramp(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * A hanging limb across a joint at height `y`: above it the upper bone,
 * below it the lower, and a soft blend `zone` either side so the skin
 * bends round the joint instead of creasing.
 */
export function across(upper: BoneName, lower: BoneName, y: number, zone: number) {
  return (at: THREE.Vector3): Weights => {
    const w = ramp(y + zone, y - zone, at.y);
    return [[upper, 1 - w], [lower, w]];
  };
}

/** Merges parts into one geometry and frees them. */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error("Athlete parts did not merge.");
  return merged;
}

/** Merges each material's parts and keeps them as groups, in order, for one mesh with several materials. */
export function groups(sets: THREE.BufferGeometry[][]): THREE.BufferGeometry {
  const merged = mergeGeometries(sets.map((s) => merge(s)), true);
  if (!merged) throw new Error("Athlete material groups did not merge.");
  return merged;
}
