import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { V3 } from "../geo";
import { seg as cut } from "./detail";

/**
 * Raw shapes for kart parts, before `part()` paints them. Higher segment
 * counts than the scenery uses, since karts are seen up close.
 */

export const rbox = (w: number, h: number, d: number, r: number, segments = 2) =>
  r > 0 ? new RoundedBoxGeometry(w, h, d, cut(segments, 1), Math.min(r, Math.min(w, h, d) / 2 - 1e-4)) : new THREE.BoxGeometry(w, h, d);

export const sphere = (r: number, w = 20, h = 14) => new THREE.SphereGeometry(r, cut(w, 6), cut(h, 4));

/** A cylinder standing on y. */
export const tube = (top: number, bottom: number, h: number, seg = 20, open = false) => new THREE.CylinderGeometry(top, bottom, h, cut(seg, 6), 1, open);

export const torus = (r: number, t: number, seg = 32, tubeSeg = 10, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, cut(tubeSeg, 4), cut(seg, 6), arc);

export const capsule = (r: number, length: number, seg = 14) => new THREE.CapsuleGeometry(r, length, cut(6, 2), cut(seg, 6));

/** A solid of revolution around y from (radius, height) pairs. */
export const lathe = (points: readonly (readonly [number, number])[], seg = 28) =>
  new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), cut(seg, 6));

/** Turns a shape standing on y to lie between two points. */
export function between(geo: THREE.BufferGeometry, a: V3, b: V3): THREE.BufferGeometry {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(from);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  geo.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return geo;
}

/** A round bar from a to b. */
export const bar = (a: V3, b: V3, r: number, seg = 12) =>
  between(tube(r, r, new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b)), seg, true), a, b);

/** A pipe bent smoothly through points, for exhaust headers, roll cages and hoses. */
export function pipe(points: readonly V3[], r: number, seg = 40, radial = 12): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.2);
  return new THREE.TubeGeometry(curve, cut(seg, 6), r, cut(radial, 5), false);
}

/** A helix along y from 0 to `length`, the path of a coil spring. */
class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private readonly radius: number, private readonly length: number, private readonly turns: number) {
    super();
  }

  override getPoint(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    const a = t * this.turns * Math.PI * 2;
    return out.set(Math.cos(a) * this.radius, t * this.length, Math.sin(a) * this.radius);
  }
}

/** A coil spring along y from 0 to `length`, for the coilover shocks. */
export const spring = (radius: number, wire: number, length: number, turns = 6) =>
  new THREE.TubeGeometry(new Helix(radius, length, turns), cut(turns * 9, turns * 4), wire, cut(5, 4), false);

/**
 * A flat plate with rounded corners, extruded with a soft edge. Its face
 * carries 0..1 texture coordinates, so a picture can be put on it.
 */
export function plate(w: number, h: number, radius: number, depth = 0.02, bevel = 0.006): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const r = Math.min(radius, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: cut(2, 1), curveSegments: cut(6, 2) });
  return faceUv(g, w + bevel * 2, h + bevel * 2);
}

/** Texture coordinates from x and y across a w by h face, centred, for pictures on flat parts. */
export function faceUv(g: THREE.BufferGeometry, w: number, h: number): THREE.BufferGeometry {
  const pos = g.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = Math.min(1, Math.max(0, pos.getX(i) / w + 0.5));
    uv[i * 2 + 1] = Math.min(1, Math.max(0, pos.getY(i) / h + 0.5));
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** A flat disc facing +z with planar texture coordinates, for badges, lenses and hub caps. */
export function disc(r: number, seg = 32): THREE.BufferGeometry {
  return faceUv(new THREE.CircleGeometry(r, cut(seg, 8)), r * 2, r * 2);
}

/** A side outline (z, y) extruded across x with rounded edges, for wings, fins and plates. */
export function profile(points: readonly (readonly [number, number])[], width: number, bevel = 0.03, smooth = false): THREE.BufferGeometry {
  const corners = points.map(([z, y]) => new THREE.Vector2(z, y));
  const outline = smooth ? new THREE.SplineCurve([...corners, corners[0]!]).getPoints(72) : corners;
  const depth = Math.max(0.005, width - bevel * 2);
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: cut(3, 1), curveSegments: cut(12, 4) });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2);
  return fitUv(g);
}

/** Stretches a shape's own texture coordinates to fill 0..1, so a picture covers it once. */
export function fitUv(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const uv = g.getAttribute("uv") as THREE.BufferAttribute | undefined;
  if (!uv) return g;
  let [u0, v0, u1, v1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < uv.count; i++) {
    u0 = Math.min(u0, uv.getX(i));
    u1 = Math.max(u1, uv.getX(i));
    v0 = Math.min(v0, uv.getY(i));
    v1 = Math.max(v1, uv.getY(i));
  }
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - u0) / (u1 - u0 || 1), (uv.getY(i) - v0) / (v1 - v0 || 1));
  return g;
}
