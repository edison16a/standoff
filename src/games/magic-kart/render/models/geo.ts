import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Small helpers for building models out of painted primitives. Every
 * part carries its colour in the vertices, so a whole kart merges into
 * a couple of meshes and costs a couple of draw calls instead of fifty.
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
const color = new THREE.Color();

/** Moves a primitive into place and paints it one colour. Consumes `geo`. */
export function paint(geo: THREE.BufferGeometry, hex: THREE.ColorRepresentation, place: Place = {}): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  geo.dispose();
  for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const s = place.scale ?? 1;
  const scale = typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  quat.setFromEuler(euler.set(...(place.rot ?? [0, 0, 0])));
  matrix.compose(new THREE.Vector3(...(place.at ?? [0, 0, 0])), quat, scale);
  g.applyMatrix4(matrix);
  color.set(hex);
  const count = g.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
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

/** Mirror copies of parts on the other side (x flipped), for symmetric details. */
export function mirrorX(parts: THREE.BufferGeometry[]): THREE.BufferGeometry[] {
  return parts.flatMap((part) => {
    const copy = part.clone();
    copy.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
    // Flipping one axis turns the triangles inside out; swap winding back.
    const pos = copy.getAttribute("position") as THREE.BufferAttribute;
    const nor = copy.getAttribute("normal") as THREE.BufferAttribute;
    const col = copy.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 3) {
      for (const attr of [pos, nor, col]) {
        const a = [attr.getX(i + 1), attr.getY(i + 1), attr.getZ(i + 1)] as const;
        attr.setXYZ(i + 1, attr.getX(i + 2), attr.getY(i + 2), attr.getZ(i + 2));
        attr.setXYZ(i + 2, ...a);
      }
    }
    return [part, copy];
  });
}

export const box = (w: number, h: number, d: number, r = 0, segments = 3) =>
  r > 0 ? new RoundedBoxGeometry(w, h, d, segments, r) : new THREE.BoxGeometry(w, h, d);

export const ball = (r: number, w = 18, h = 12) => new THREE.SphereGeometry(r, w, h);

/** A cylinder standing on y. */
export const cyl = (top: number, bottom: number, h: number, seg = 16, open = false) => new THREE.CylinderGeometry(top, bottom, h, seg, 1, open);

export const ring = (r: number, tube: number, seg = 24, tubeSeg = 8, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, tubeSeg, seg, arc);

/** A solid of revolution around y from (radius, height) pairs. */
export const lathe = (points: readonly (readonly [number, number])[], seg = 20) =>
  new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);

/**
 * A side profile, drawn as (z, y) pairs with the nose at positive z,
 * extruded across the kart's width with rounded edges. This is what gives
 * the kart bodies their smooth car shaped silhouettes.
 */
export function profile(points: readonly (readonly [number, number])[], width: number, bevel = 0.08, curve = false): THREE.BufferGeometry {
  const corners = points.map(([z, y]) => new THREE.Vector2(z, y));
  // A curved profile runs a spline through the points, for soft bodywork.
  const outline = curve ? new THREE.SplineCurve([...corners, corners[0]!]).getPoints(64) : corners;
  return extrude(new THREE.Shape(outline), width, bevel);
}

function extrude(shape: THREE.Shape, width: number, bevel: number): THREE.BufferGeometry {
  const depth = Math.max(0.01, width - bevel * 2);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 16,
  });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

/** A flat star, for decals, badges and the cubes. */
export function starShape(outer: number, inner: number, points = 5): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
}

/** A painted rod from a to b, for frames, struts, antennas and railings. */
export function rod(a: V3, b: V3, radius: number, hex: THREE.ColorRepresentation, segments = 10): THREE.BufferGeometry {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(from);
  const g = paint(cyl(radius, radius, dir.length(), segments), hex);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

export const flat = (shape: THREE.Shape, thickness = 0.02) =>
  new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 8 });
