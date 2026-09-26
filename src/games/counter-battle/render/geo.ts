import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Models built from painted primitives. Each part carries its colour in
 * its vertices, so a whole body segment, gun or bunker merges into one
 * mesh that shares one material: a handful of draw calls per fighter,
 * which matters when four views draw the same arena every frame.
 */

export type Vec = readonly [number, number, number];

export interface Place {
  at?: Vec;
  /** Euler angles in radians, applied X then Y then Z. */
  rot?: Vec;
  scale?: Vec | number;
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
/** The top of a sphere down to `share` of the way from the top pole to the bottom, for helmets and caps. */
export const dome = (r: number, share = 0.55, w = 18, h = 10) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI * share);
/** A cylinder standing on y, centred on its middle. */
export const cyl = (top: number, bottom: number, h: number, seg = 14) => new THREE.CylinderGeometry(top, bottom, h, seg, 1);
export const capsule = (r: number, length: number, seg = 12) => new THREE.CapsuleGeometry(r, length, 4, seg);
export const cone = (r: number, h: number, seg = 12) => new THREE.ConeGeometry(r, h, seg);
export const torus = (r: number, tube: number, seg = 24, tubeSeg = 8, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, tubeSeg, seg, arc);

/** A box with rounded edges, for pouches, plates and receivers. */
export function roundBox(w: number, h: number, d: number, r: number, seg = 2): THREE.BufferGeometry {
  // The bevel rounds the front and back edges; the outline is shrunk by it so the box keeps its size.
  const bevel = Math.min(r, w / 2, h / 2, d / 2) * 0.6;
  const radius = Math.max(0.0005, Math.min(r, w / 2, h / 2) - bevel);
  const x = Math.max(0, w / 2 - bevel - radius);
  const y = Math.max(0, h / 2 - bevel - radius);
  const shape = new THREE.Shape();
  shape.absarc(x, y, radius, 0, Math.PI / 2, false);
  shape.absarc(-x, y, radius, Math.PI / 2, Math.PI, false);
  shape.absarc(-x, -y, radius, Math.PI, Math.PI * 1.5, false);
  shape.absarc(x, -y, radius, Math.PI * 1.5, Math.PI * 2, false);
  const depth = Math.max(0.0005, d - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0.0005, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: seg * 2 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/** A solid of revolution around y from (radius, height) pairs. */
export function lathe(points: readonly (readonly [number, number])[], seg = 20): THREE.LatheGeometry {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg);
}

/** A painted rod from a to b, for straps, struts and poles. */
export function rod(a: Vec, b: Vec, radius: number, hex: THREE.ColorRepresentation, segments = 8): THREE.BufferGeometry {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(from);
  const g = paint(cyl(radius, radius, dir.length(), segments), hex);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

/** A darker (negative) or lighter (positive) shade of a colour. */
export function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  const to = new THREE.Color(amount < 0 ? "#000000" : "#ffffff");
  return `#${c.lerp(to, Math.abs(amount)).getHexString()}`;
}

/** Blends two colours, a share `t` of the way from a to b. */
export function blend(a: string, b: string, t: number): string {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}
