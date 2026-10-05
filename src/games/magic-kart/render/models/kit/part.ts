import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { V3 } from "../geo";
import { atlasUv, WHITE_UV, type Region } from "./atlas-layout";
import { FINISHES, type Finish } from "./finish";

/**
 * Turns a raw three.js shape into a kart part: placed, painted one colour,
 * given its finish, and pointed at the shared texture. Every part carries
 * the same attributes, so a whole kart merges into one geometry.
 */

export interface Place {
  at?: V3;
  /** Euler angles in radians, applied X then Y then Z. */
  rot?: V3;
  scale?: V3 | number;
}

export interface Look extends Place {
  finish?: Finish;
  /** Maps the shape's own 0..1 texture coordinates into this picture of the atlas. */
  region?: Region;
  /** The shape already carries atlas coordinates; keep them. */
  atlas?: boolean;
}

const matrix = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const color = new THREE.Color();
const KEEP = ["position", "normal", "uv"];

/**
 * Moves a shape into place and paints it. Consumes `geo`. Parts stay
 * indexed (a plain list of triangles gets an index of its own), so the
 * corners three.js already shares stay shared in the merged kart.
 */
export function part(geo: THREE.BufferGeometry, hex: THREE.ColorRepresentation, look: Look = {}): THREE.BufferGeometry {
  const g = geo.clone();
  geo.dispose();
  for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
  const count = g.getAttribute("position").count;
  if (!g.index) g.setIndex(Array.from({ length: count }, (_, i) => i));
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const uv = new Float32Array(count * 2);
  const own = g.getAttribute("uv");
  if (look.atlas && own) uv.set(own.array as Float32Array);
  else if (look.region && own) {
    for (let i = 0; i < count; i++) {
      const [u, v] = atlasUv(look.region, own.getX(i), own.getY(i));
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;
    }
  } else {
    for (let i = 0; i < count; i++) {
      uv[i * 2] = WHITE_UV[0];
      uv[i * 2 + 1] = WHITE_UV[1];
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  place(g, look);
  color.set(hex);
  const colors = new Float32Array(count * 3);
  const finish = new Float32Array(count * 4);
  const [r, m, c, w] = FINISHES[look.finish ?? "paint"];
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    finish[i * 4] = r;
    finish[i * 4 + 1] = m;
    finish[i * 4 + 2] = c;
    finish[i * 4 + 3] = w;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.setAttribute("finish", new THREE.BufferAttribute(finish, 4));
  return g;
}

/** Applies a placement to a geometry in place. */
export function place(g: THREE.BufferGeometry, p: Place): THREE.BufferGeometry {
  const s = p.scale ?? 1;
  const scale = typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  quat.setFromEuler(euler.set(...(p.rot ?? [0, 0, 0])));
  matrix.compose(new THREE.Vector3(...(p.at ?? [0, 0, 0])), quat, scale);
  g.applyMatrix4(matrix);
  return g;
}

/** Recolours a painted part vertex by vertex, for fades like heat blued pipes. */
export function tint(g: THREE.BufferGeometry, shade: (p: THREE.Vector3) => THREE.ColorRepresentation): THREE.BufferGeometry {
  const pos = g.getAttribute("position");
  const col = g.getAttribute("color") as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    color.set(shade(p.fromBufferAttribute(pos, i)));
    col.setXYZ(i, color.r, color.g, color.b);
  }
  return g;
}

/** Copies of parts mirrored to the other side (x flipped), with the triangles turned the right way out. */
export function mirrored(parts: THREE.BufferGeometry[]): THREE.BufferGeometry[] {
  return parts.flatMap((p) => {
    const copy = p.clone();
    copy.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
    // Flipping one axis turns every triangle inside out; swapping two corners turns it back.
    const index = copy.index!.array;
    for (let i = 0; i < index.length; i += 3) {
      const a = index[i + 1]!;
      index[i + 1] = index[i + 2]!;
      index[i + 2] = a;
    }
    return [p, copy];
  });
}

/**
 * Merges parts into one indexed geometry and frees them, so the graphics
 * card shades each shared corner once rather than once per triangle.
 */
export function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("Kart parts did not merge.");
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}
