import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { smooth } from "./parts";

/**
 * The sculpted skull and face, in the head's own frame: centred between
 * the ears, facing +z, about 23 centimetres from chin to crown. A sphere
 * is pushed into shape: a fuller crown, a jaw that narrows to the chin,
 * the brow, the eye sockets, cheekbones and lips. Hair, beards and
 * headbands are shells lifted off this same surface, so they always fit.
 */

const gauss = (p: THREE.Vector3, cx: number, cy: number, cz: number, sx: number, sy = sx, sz = sx) =>
  Math.exp(-(((p.x - cx) / sx) ** 2 + ((p.y - cy) / sy) ** 2 + ((p.z - cz) / sz) ** 2));

/** Both sides at once: a feature at ±x. */
const pair = (p: THREE.Vector3, cx: number, cy: number, cz: number, sx: number, sy = sx, sz = sx) =>
  gauss(p, cx, cy, cz, sx, sy, sz) + gauss(p, -cx, cy, cz, sx, sy, sz);

/** Where the main features sit, shared by the face's separate parts. */
export const FACE = {
  eyeY: 0.008,
  eyeX: 0.031,
  eyeZ: 0.079,
  browY: 0.027,
  noseTipY: -0.034,
  mouthY: -0.062,
  chinY: -0.104,
  earX: 0.071,
};

const base = new THREE.Vector3();

/** The surface point straight out from the centre along unit direction `d`. */
export function sculpt(d: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  const a = 0.074;
  const b = 0.115;
  const c = 0.097;
  const r = 1 / Math.sqrt((d.x / a) ** 2 + (d.y / b) ** 2 + (d.z / c) ** 2);
  base.copy(d).multiplyScalar(r);
  base.y += 0.01;
  const p = out.copy(base);
  const front = Math.max(0, d.z);
  const back = Math.max(0, -d.z);
  // The jaw narrows toward the chin, more at the front than at its angle under the ears.
  const low = smooth(0.0, -0.1, base.y);
  p.x *= 1 - 0.3 * low * (0.45 + 0.55 * front);
  // Under the back of the skull the head curves in to meet the neck.
  p.z *= 1 - 0.5 * smooth(-0.01, -0.09, base.y) * back;
  // A flatter face, and a forehead that slopes back.
  p.z -= 0.006 * front ** 4 + 0.01 * smooth(0.06, 0.12, base.y) * front ** 2;
  let push = 0;
  push += 0.006 * gauss(base, 0, FACE.browY + 0.004, 0.09, 0.05, 0.011, 0.04) * front;
  push -= 0.008 * pair(base, FACE.eyeX, FACE.eyeY, 0.088, 0.016, 0.012);
  push += 0.005 * pair(base, 0.053, -0.014, 0.068, 0.018);
  push -= 0.003 * pair(base, 0.068, 0.042, 0.04, 0.02);
  push += 0.009 * gauss(base, 0, FACE.chinY + 0.012, 0.075, 0.02, 0.014, 0.03);
  push += 0.004 * gauss(base, 0, FACE.mouthY + 0.003, 0.09, 0.02, 0.006, 0.03);
  push += 0.0035 * gauss(base, 0, FACE.mouthY - 0.009, 0.09, 0.017, 0.006, 0.03);
  push += 0.004 * gauss(base, 0, FACE.noseTipY, 0.095, 0.02, 0.02, 0.02);
  return p.addScaledVector(d, push);
}

export interface HeadSurface {
  /** The skin of the head: welded, smooth normals, no uvs. */
  geo: THREE.BufferGeometry;
  /** Each vertex's direction from the centre, for masks. */
  dirs: Float32Array;
  /** Each vertex's spot before scaling, in the head's own units, for masks placed by position. */
  bases: Float32Array;
}

/** The head's skin as a sphere of `w` by `h` segments pushed into shape, scaled by `k`. */
export function headSurface(w: number, h: number, k: number): HeadSurface {
  const sphere = new THREE.SphereGeometry(1, w, h);
  sphere.deleteAttribute("normal");
  sphere.deleteAttribute("uv");
  const geo = mergeVertices(sphere);
  sphere.dispose();
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const dirs = new Float32Array(pos.count * 3);
  const bases = new Float32Array(pos.count * 3);
  const d = new THREE.Vector3();
  const out = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    sculpt(d, out);
    dirs.set([d.x, d.y, d.z], i * 3);
    bases.set([out.x, out.y, out.z], i * 3);
    pos.setXYZ(i, out.x * k, out.y * k, out.z * k);
  }
  geo.computeVertexNormals();
  return { geo, dirs, bases };
}

/**
 * A shell lifted off the head by `lift(base, dir)` metres along the normal
 * at each vertex, keeping only the triangles where all three corners
 * lift: hair, a beard, a headband. `paint` colours each corner from
 * the head's spot under it, so an edge can fade into the skin.
 */
export function shell(
  head: HeadSurface,
  lift: (base: THREE.Vector3, dir: THREE.Vector3) => number,
  paint?: (base: THREE.Vector3, dir: THREE.Vector3, out: THREE.Color) => void,
): THREE.BufferGeometry | null {
  const pos = head.geo.getAttribute("position");
  const nrm = head.geo.getAttribute("normal");
  const idx = head.geo.index!;
  const amount = new Float32Array(pos.count);
  const b = new THREE.Vector3();
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) amount[i] = lift(b.fromArray(head.bases, i * 3), d.fromArray(head.dirs, i * 3));
  const keep: number[] = [];
  for (let t = 0; t < idx.count; t += 3) {
    const [x, y, z] = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
    if (amount[x]! > 0 && amount[y]! > 0 && amount[z]! > 0) keep.push(x, y, z);
  }
  if (!keep.length) return null;
  // Only the corners used are kept, renumbered.
  const map = new Map<number, number>();
  for (const i of keep) if (!map.has(i)) map.set(i, map.size);
  const out = new Float32Array(map.size * 3);
  const colours = new Float32Array(map.size * 3).fill(1);
  const c = new THREE.Color();
  for (const [i, j] of map) {
    const a = amount[i]!;
    out.set([pos.getX(i) + nrm.getX(i) * a, pos.getY(i) + nrm.getY(i) * a, pos.getZ(i) + nrm.getZ(i) * a], j * 3);
    if (!paint) continue;
    paint(b.fromArray(head.bases, i * 3), d.fromArray(head.dirs, i * 3), c);
    colours.set([c.r, c.g, c.b], j * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(out, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  geo.setIndex(keep.map((i) => map.get(i)!));
  geo.computeVertexNormals();
  return geo;
}

/** A cheap, smooth 3D noise in -1 to 1, for curls and the grain of hair. */
export function noise3(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 1.7 + Math.sin(y * 2.3) * 1.3) * Math.cos(y * 1.9 + Math.sin(z * 1.1) * 1.7) * 0.6 +
    Math.sin(z * 2.9 + Math.cos(x * 2.1)) * 0.4
  );
}
