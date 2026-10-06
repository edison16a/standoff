import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * The sculpted skull and face of a 1.8 m player, in the head's own frame:
 * centred between the ears, facing +z, about 23 centimetres from chin to
 * crown. A sphere is pushed into shape: a fuller crown and back, a jaw
 * narrowing to the chin, the brow ridge over deep set eyes, cheekbones,
 * the muzzle round the mouth. Hair and beards are shells lifted off this
 * same surface, so they always fit it.
 */

/** Where the features sit, shared by the separate parts of the face. */
export const FACE = {
  eyeX: 0.0315,
  eyeY: 0.01,
  eyeZ: 0.0715,
  eyeR: 0.0115,
  browY: 0.03,
  noseTopY: 0.012,
  noseTipY: -0.03,
  mouthY: -0.056,
  chinY: -0.103,
  earX: 0.072,
  earY: -0.004,
  earZ: -0.008,
};

const gauss = (p: THREE.Vector3, cx: number, cy: number, cz: number, sx: number, sy = sx, sz = sx) =>
  Math.exp(-(((p.x - cx) / sx) ** 2 + ((p.y - cy) / sy) ** 2 + ((p.z - cz) / sz) ** 2));

/** Both sides at once: a feature at ±x. */
const pair = (p: THREE.Vector3, cx: number, cy: number, cz: number, sx: number, sy = sx, sz = sx) =>
  gauss(p, cx, cy, cz, sx, sy, sz) + gauss(p, -cx, cy, cz, sx, sy, sz);

const ramp = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A head's own shape: wider or narrower in the jaw, stronger in the chin. */
export interface HeadShape {
  jaw: number;
  chin: number;
}

const base = new THREE.Vector3();

/** The surface point straight out from the centre along unit direction `d`. */
export function sculpt(d: THREE.Vector3, out: THREE.Vector3, shape: HeadShape = { jaw: 0.5, chin: 0.5 }): THREE.Vector3 {
  const r = 1 / Math.sqrt((d.x / 0.0755) ** 2 + (d.y / 0.115) ** 2 + (d.z / 0.098) ** 2);
  base.copy(d).multiplyScalar(r);
  base.y += 0.011;
  const p = out.copy(base);
  const front = Math.max(0, d.z);
  const back = Math.max(0, -d.z);
  // The jaw narrows toward the chin, more at the front than at its angle under the ears.
  const low = ramp(0.0, -0.105, base.y);
  p.x *= 1 - (0.2 - 0.1 * shape.jaw) * low * (0.4 + 0.6 * front);
  // The back of the skull is full, then curves in under it to meet the neck.
  p.z *= 1 + 0.06 * ramp(-0.04, 0.03, base.y) * ramp(0.06, -0.01, base.y) * back;
  p.z *= 1 - 0.48 * ramp(-0.02, -0.095, base.y) * back;
  // A flatter face and a forehead that slopes back to the crown.
  p.z -= 0.007 * front ** 4 + 0.012 * ramp(0.06, 0.12, base.y) * front ** 2;
  let push = 0;
  push += 0.0095 * gauss(base, 0, FACE.browY + 0.004, 0.09, 0.048, 0.0105, 0.04) * front;
  push -= 0.0105 * pair(base, FACE.eyeX, FACE.eyeY, 0.088, 0.0165, 0.0125);
  push += 0.008 * pair(base, 0.053, -0.014, 0.064, 0.017, 0.014, 0.02);
  push -= 0.0045 * pair(base, 0.066, 0.042, 0.04, 0.02);
  push += (0.004 + 0.005 * shape.jaw) * pair(base, 0.058, -0.074, 0.016, 0.018, 0.016, 0.03);
  push -= 0.0015 * pair(base, 0.046, -0.047, 0.07, 0.013);
  push += (0.009 + 0.007 * shape.chin) * gauss(base, 0, FACE.chinY + 0.014, 0.06, 0.03, 0.016, 0.035);
  push += 0.0045 * gauss(base, 0, FACE.mouthY + 0.004, 0.09, 0.022, 0.007, 0.03);
  push += 0.0035 * gauss(base, 0, FACE.mouthY - 0.008, 0.09, 0.018, 0.006, 0.03);
  push += 0.0025 * gauss(base, 0, FACE.noseTipY, 0.095, 0.02, 0.02, 0.02);
  push -= 0.0025 * gauss(base, 0, FACE.mouthY - 0.022, 0.09, 0.012, 0.006, 0.03);
  return p.addScaledVector(d, push);
}

export interface HeadSurface {
  /** The skin of the head: welded, with smooth normals. */
  geo: THREE.BufferGeometry;
  /** Each vertex's direction from the centre, for masks. */
  dirs: Float32Array;
  /** Each vertex's spot before scaling, in the head's own units. */
  bases: Float32Array;
  shape: HeadShape;
}

/** The head's skin: a sphere of `w` by `h` segments pushed into shape, scaled by `k`. */
export function headSurface(w: number, h: number, k: number, shape: HeadShape): HeadSurface {
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
    sculpt(d, out, shape);
    dirs.set([d.x, d.y, d.z], i * 3);
    bases.set([out.x, out.y, out.z], i * 3);
    pos.setXYZ(i, out.x * k, out.y * k, out.z * k);
  }
  geo.computeVertexNormals();
  return { geo, dirs, bases, shape };
}

/** Where the face's surface is on the centre line at height `y`, in the head's units. */
export function faceZ(y: number, shape?: HeadShape): number {
  const d = new THREE.Vector3();
  const p = new THREE.Vector3();
  let dy = y / 0.1;
  for (let i = 0; i < 5; i++) {
    sculpt(d.set(0, dy, 1).normalize(), p, shape);
    dy += (y - p.y) / 0.1;
  }
  return p.z;
}

/** The surface point at a spot (x, y) on the front of the face, in the head's units. */
export function facePoint(x: number, y: number, shape?: HeadShape): THREE.Vector3 {
  const d = new THREE.Vector3();
  const p = new THREE.Vector3();
  let dx = x / 0.08;
  let dy = y / 0.1;
  for (let i = 0; i < 6; i++) {
    sculpt(d.set(dx, dy, 1).normalize(), p, shape);
    dx += (x - p.x) / 0.08;
    dy += (y - p.y) / 0.1;
  }
  return p.clone();
}
