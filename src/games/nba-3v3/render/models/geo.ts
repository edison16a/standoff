import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Helpers for building models from painted primitives. Each part carries
 * its colour in its vertices, so all the parts that move together (a
 * head with its hair, beard and ears) merge into one mesh and one draw.
 */

export type Tuple3 = readonly [number, number, number];

export interface Place {
  at?: Tuple3;
  /** Euler angles in radians, X then Y then Z. */
  rot?: Tuple3;
  scale?: Tuple3 | number;
}

const matrix = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const colour = new THREE.Color();

/** Moves a primitive into place and paints it one colour. Consumes `geo`. */
export function paint(geo: THREE.BufferGeometry, hex: THREE.ColorRepresentation, place: Place = {}): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  geo.dispose();
  for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
  const s = place.scale ?? 1;
  const scale = typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  quat.setFromEuler(euler.set(...(place.rot ?? [0, 0, 0])));
  matrix.compose(new THREE.Vector3(...(place.at ?? [0, 0, 0])), quat, scale);
  g.applyMatrix4(matrix);
  colour.set(hex);
  const count = g.getAttribute("position").count;
  const colours = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colours.set([colour.r, colour.g, colour.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  return g;
}

/** Merges painted parts into one geometry and frees the parts. */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error("Model parts did not merge.");
  merged.computeBoundingSphere();
  return merged;
}

export const ball = (r: number, w = 18, h = 14) => new THREE.SphereGeometry(r, w, h);

/** A capsule standing on y, `length` between the centres of its round ends. */
export const capsule = (r: number, length: number, cap = 6, radial = 14) => new THREE.CapsuleGeometry(r, length, cap, radial);

export const cyl = (top: number, bottom: number, h: number, seg = 16, open = false) => new THREE.CylinderGeometry(top, bottom, h, seg, 1, open);

export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

export interface LimbShape {
  /** How much a muscle swells, as a share of the radius. */
  bulge?: number;
  /** Where along the limb it swells, 0 at the joint to 1 at the far end. */
  at?: number;
  seg?: number;
}

/**
 * A smooth limb segment hanging from its joint: rounded at both ends,
 * tapering from r0 to r1 over `length`, with an optional muscle swell.
 * Turned on a lathe, so the shading is smooth all the way round.
 */
export function limb(r0: number, r1: number, length: number, shape: LimbShape = {}): THREE.BufferGeometry {
  const { bulge = 0, at = 0.35, seg = 14 } = shape;
  const pts: THREE.Vector2[] = [];
  const cap = 4;
  for (let i = 0; i <= cap; i++) {
    const a = (i / cap) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * r1, -length - Math.cos(a) * r1));
  }
  const body = 8;
  for (let i = 1; i < body; i++) {
    const u = 1 - i / body;
    const k = Math.max(0, 1 - Math.abs(u - at) * 2.4);
    const r = (r0 + (r1 - r0) * u) * (1 + bulge * k * k);
    pts.push(new THREE.Vector2(r, -length * u));
  }
  for (let i = 0; i <= cap; i++) {
    const a = (i / cap) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0));
  }
  return new THREE.LatheGeometry(pts, seg);
}

/**
 * A solid of revolution from (radius, height) pairs listed bottom to top.
 * The outline is resampled at even heights, so a texture wrapped on it
 * is not stretched between widely spaced points.
 */
export function lathe(points: readonly (readonly [number, number])[], seg = 20, rows = 14): THREE.LatheGeometry {
  const y0 = points[0]![1];
  const y1 = points[points.length - 1]![1];
  const out: THREE.Vector2[] = [];
  for (let i = 0; i <= rows; i++) {
    const y = y0 + ((y1 - y0) * i) / rows;
    let k = 0;
    while (k < points.length - 2 && points[k + 1]![1] < y) k++;
    const [ra, ya] = points[k]!;
    const [rb, yb] = points[k + 1]!;
    const u = yb === ya ? 0 : (y - ya) / (yb - ya);
    out.push(new THREE.Vector2(ra + (rb - ra) * u, y));
  }
  return new THREE.LatheGeometry(out, seg);
}
