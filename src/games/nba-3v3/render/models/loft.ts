import * as THREE from "three";

/** A shape across a tube: the offset [x, z] from the centre at angle `a` (0 at the front, +z; π/2 at the model's left, +x). */
export type Section = (a: number) => readonly [number, number];

/**
 * An egg shaped section: each half can bulge on its own, so a calf
 * swells at the back and a biceps at the front. `left` and `right` are
 * the half widths toward +x and -x, `front` and `back` the half depths.
 * `power` above 2 squares the corners off, as across a chest.
 */
export function egg(left: number, right: number, front: number, back: number, power = 2): Section {
  const e = 2 / power;
  return (a) => {
    const s = Math.sin(a);
    const c = Math.cos(a);
    const x = Math.sign(s) * Math.abs(s) ** e * (s >= 0 ? left : right);
    const z = Math.sign(c) * Math.abs(c) ** e * (c >= 0 ? front : back);
    return [x, z];
  };
}

/** A ring of `n` points round a vertical axis through (cx, y, cz), starting at angle `a0`. */
export function ringY(cx: number, y: number, cz: number, n: number, shape: Section, a0 = 0): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let j = 0; j < n; j++) {
    const [x, z] = shape(a0 + (j / n) * Math.PI * 2);
    out.push(new THREE.Vector3(cx + x, y, cz + z));
  }
  return out;
}

/** A ring of `n` points round an axis along z through (cx, cy, z): `shape(a)` gives [x, y], a = 0 at the top. */
export function ringZ(cx: number, cy: number, z: number, n: number, shape: Section): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let j = 0; j < n; j++) {
    const [x, y] = shape((j / n) * Math.PI * 2);
    out.push(new THREE.Vector3(cx + x, cy + y, z));
  }
  return out;
}

export interface Caps {
  start?: THREE.Vector3;
  end?: THREE.Vector3;
}

/**
 * A smooth skin stretched over rings of points, each ring closed on
 * itself, optionally closed at either end on a single point. Every ring
 * needs the same number of points. Normals are smooth across the seam
 * where the rings close, and the faces always point outward. `u` runs
 * round each ring and `v` along the rings.
 */
export function loft(rings: readonly THREE.Vector3[][], caps: Caps = {}): THREE.BufferGeometry {
  const n = rings[0]!.length;
  const cols = n + 1;
  const all: { pts: readonly THREE.Vector3[]; pole: boolean }[] = [];
  if (caps.start) all.push({ pts: Array.from({ length: n }, () => caps.start!), pole: true });
  for (const r of rings) all.push({ pts: r, pole: false });
  if (caps.end) all.push({ pts: Array.from({ length: n }, () => caps.end!), pole: true });
  const rows = all.length;
  const pos = new Float32Array(rows * cols * 3);
  const uv = new Float32Array(rows * cols * 2);
  all.forEach(({ pts }, i) => {
    for (let j = 0; j < cols; j++) {
      const q = pts[j % n]!;
      pos.set([q.x, q.y, q.z], (i * cols + j) * 3);
      uv.set([j / n, rows > 1 ? i / (rows - 1) : 0], (i * cols + j) * 2);
    }
  });
  const index: number[] = [];
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < n; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      // Next to a pole one triangle of the quad has no area, so only the other is kept.
      if (!all[i]!.pole) index.push(a, b, d);
      if (!all[i + 1]!.pole) index.push(a, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  if (facesInward(geo, rings, caps.start ? 1 : 0, cols)) flip(geo);
  geo.computeVertexNormals();
  weld(geo, all.map((r) => r.pole), cols);
  return geo;
}

const va = new THREE.Vector3();
const vb = new THREE.Vector3();
const vc = new THREE.Vector3();

/** Whether the first quad of the middle ring faces in toward the ring's centre. */
function facesInward(geo: THREE.BufferGeometry, rings: readonly THREE.Vector3[][], offset: number, cols: number): boolean {
  if (rings.length < 2) return false;
  const i = Math.min(rings.length - 2, Math.floor(rings.length / 2));
  const ring = rings[i]!;
  const centre = ring.reduce((sum, q) => sum.add(q), new THREE.Vector3()).divideScalar(ring.length);
  const pos = geo.getAttribute("position");
  const a = (i + offset) * cols;
  va.fromBufferAttribute(pos, a);
  vb.fromBufferAttribute(pos, a + 1).sub(va);
  vc.fromBufferAttribute(pos, a + cols + 1).sub(va);
  const normal = vb.clone().cross(vc);
  return normal.dot(va.clone().sub(centre)) < 0;
}

function flip(geo: THREE.BufferGeometry): void {
  const idx = geo.index!;
  for (let k = 0; k < idx.count; k += 3) {
    const b = idx.getX(k + 1);
    idx.setX(k + 1, idx.getX(k + 2));
    idx.setX(k + 2, b);
  }
}

/** Shares one normal between the two copies of each seam point, and one between all copies of a pole. */
function weld(geo: THREE.BufferGeometry, poles: boolean[], cols: number): void {
  const nrm = geo.getAttribute("normal") as THREE.BufferAttribute;
  const sum = new THREE.Vector3();
  poles.forEach((pole, i) => {
    const first = i * cols;
    const last = first + cols - 1;
    if (pole) {
      sum.set(0, 0, 0);
      for (let j = first; j <= last; j++) sum.add(va.fromBufferAttribute(nrm, j));
      sum.normalize();
      for (let j = first; j <= last; j++) nrm.setXYZ(j, sum.x, sum.y, sum.z);
      return;
    }
    sum.fromBufferAttribute(nrm, first).add(va.fromBufferAttribute(nrm, last)).normalize();
    nrm.setXYZ(first, sum.x, sum.y, sum.z);
    nrm.setXYZ(last, sum.x, sum.y, sum.z);
  });
  nrm.needsUpdate = true;
}
