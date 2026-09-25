import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Helpers for the low poly look: every primitive is placed, painted one
 * colour in its vertices and given flat normals, so parts that move
 * together merge into one mesh and one draw, and every face catches the
 * light on its own like a cut gem.
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
const at = new THREE.Vector3();
const size = new THREE.Vector3();

/** Moves a primitive into place and paints it one colour. Consumes `geo`. */
export function paint(geo: THREE.BufferGeometry, hex: THREE.ColorRepresentation, place: Place = {}): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  geo.dispose();
  for (const name of Object.keys(g.attributes)) if (name !== "position") g.deleteAttribute(name);
  const s = place.scale ?? 1;
  if (typeof s === "number") size.set(s, s, s);
  else size.set(...s);
  quat.setFromEuler(euler.set(...(place.rot ?? [0, 0, 0])));
  matrix.compose(at.set(...(place.at ?? [0, 0, 0])), quat, size);
  g.applyMatrix4(matrix);
  // Non indexed, so each triangle gets its own flat normal.
  g.computeVertexNormals();
  colour.set(hex);
  const count = g.getAttribute("position").count;
  const colours = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colours.set([colour.r, colour.g, colour.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  return g;
}

/** Merges painted parts into one geometry and frees the parts. */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (parts.length === 0) return new THREE.BufferGeometry();
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error("Model parts did not merge.");
  merged.computeBoundingSphere();
  return merged;
}

/** Few segments on purpose: the facets are the style. */
export const ball = (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
export const ico = (r: number, detail = 0) => new THREE.IcosahedronGeometry(r, detail);
export const cyl = (top: number, bottom: number, h: number, seg = 7) => new THREE.CylinderGeometry(top, bottom, h, seg, 1);
export const cone = (r: number, h: number, seg = 6) => new THREE.ConeGeometry(r, h, seg, 1);
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const torus = (r: number, tube: number, radial = 5, tubular = 10, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, radial, tubular, arc);

/** A limb hanging down from its joint: `length` long, tapering from r0 to r1. */
export function limb(r0: number, r1: number, length: number, seg = 6): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r0, r1, length, seg, 1);
  g.translate(0, -length / 2, 0);
  return g;
}

/** A rounded end for a limb, so bent joints never show a gap. */
export const knob = (r: number) => new THREE.IcosahedronGeometry(r, 0);

/** A painted solid lit with flat faces, sharing one material per scene. */
export function solidMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.72, metalness: 0.04 });
}

/** Bright self lit parts: lanterns, crystals, gems. Never darkened by lights. */
export function glowMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
}
