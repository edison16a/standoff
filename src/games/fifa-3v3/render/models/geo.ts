import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Building models out of painted primitives. Every part carries its
 * colour in its vertices, so a whole body segment merges into one mesh
 * and all players share one material: a few draw calls per player.
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

/** Moves a primitive into place and paints it one colour. Consumes `geo`. */
export function paint(geo: THREE.BufferGeometry, hex: THREE.ColorRepresentation, place: Place = {}): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  geo.dispose();
  for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const s = place.scale ?? 1;
  const size = typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  quat.setFromEuler(euler.set(...(place.rot ?? [0, 0, 0])));
  matrix.compose(new THREE.Vector3(...(place.at ?? [0, 0, 0])), quat, size);
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

export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const ball = (r: number, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
/** A cylinder standing on y. */
export const cyl = (top: number, bottom: number, h: number, seg = 14) => new THREE.CylinderGeometry(top, bottom, h, seg, 1);
export const capsule = (r: number, length: number, seg = 12) => new THREE.CapsuleGeometry(r, length, 4, seg);
export const cone = (r: number, h: number, seg = 10) => new THREE.ConeGeometry(r, h, seg);
export const torus = (r: number, tube: number, seg = 24, tubeSeg = 8, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, tubeSeg, seg, arc);

/** A solid of revolution around y from (radius, height) pairs. */
export function lathe(points: readonly (readonly [number, number])[], seg = 20, phiStart = 0): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    seg,
    phiStart,
  );
}

/** A painted rod from a to b, for frames, struts and net supports. */
export function rod(a: V3, b: V3, radius: number, hex: THREE.ColorRepresentation, segments = 10): THREE.BufferGeometry {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(from);
  const g = paint(cyl(radius, radius, dir.length(), segments), hex);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

/** Blends two hex colours, for fades like a buzz cut over skin. */
export function blend(a: string, b: string, t: number): string {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}

/** A darker or lighter shade of a colour. */
export function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  return amount < 0 ? `#${c.lerp(new THREE.Color("#000000"), -amount).getHexString()}` : `#${c.lerp(new THREE.Color("#ffffff"), amount).getHexString()}`;
}
