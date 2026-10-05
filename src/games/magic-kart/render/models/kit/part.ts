import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
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

/** Moves a shape into place and paints it. Consumes `geo`. */
export function part(geo: THREE.BufferGeometry, hex: THREE.ColorRepresentation, look: Look = {}): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  geo.dispose();
  for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const count = g.getAttribute("position").count;
  const uv = new Float32Array(count * 2);
  const own = g.getAttribute("uv");
  if (look.atlas && own) uv.set(own.array as Float32Array);
  else for (let i = 0; i < count; i++) {
    const [u, v] = look.region && own ? atlasUv(look.region, own.getX(i), own.getY(i)) : WHITE_UV;
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  place(g, look);
  color.set(hex);
  const colors = new Float32Array(count * 3);
  const finish = new Float32Array(count * 4);
  const f = FINISHES[look.finish ?? "paint"];
  for (let i = 0; i < count; i++) {
    colors.set([color.r, color.g, color.b], i * 3);
    finish.set(f, i * 4);
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
    const attrs = Object.values(copy.attributes) as THREE.BufferAttribute[];
    for (let i = 0; i < copy.getAttribute("position").count; i += 3) {
      for (const attr of attrs) {
        const n = attr.itemSize;
        for (let k = 0; k < n; k++) {
          const a = attr.array[(i + 1) * n + k]!;
          attr.array[(i + 1) * n + k] = attr.array[(i + 2) * n + k]!;
          attr.array[(i + 2) * n + k] = a;
        }
      }
    }
    return [p, copy];
  });
}

/**
 * Merges parts into one geometry and frees them. Corners that match in
 * every attribute are then shared, so the graphics card shades each one
 * once rather than once for every triangle that touches it.
 */
export function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const joined = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!joined) throw new Error("Kart parts did not merge.");
  const merged = mergeVertices(joined, 1e-5);
  joined.dispose();
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}
