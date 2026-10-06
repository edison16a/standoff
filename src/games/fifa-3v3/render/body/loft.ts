import * as THREE from "three";

/**
 * Smooth skins stretched over rings of points: the way every limb, the
 * torso, the kit and the boots are built. A ring is closed on itself;
 * each ring of one loft has the same number of points, so the surface
 * is one seamless grid with soft normals across the seam.
 */

/** A shape across a tube: the offset [x, z] from its centre at angle `a`, 0 at the front (+z) and π/2 at the model's left (+x). */
export type Section = (a: number) => readonly [number, number];

/**
 * An egg shaped section: each half bulges on its own, so a calf swells
 * at the back and a shin pad at the front. `left` and `right` are the
 * half widths toward +x and -x, `front` and `back` the half depths.
 * A `power` above 2 squares the corners off, as across a chest.
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

export interface Caps {
  start?: THREE.Vector3;
  end?: THREE.Vector3;
}

/**
 * The grid over the rings, optionally closed at either end on a single
 * point. `u` runs once round each ring, starting at its first point, and
 * `v` along the rings from 0 to 1. The faces always point outward.
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
      // Beside a pole one triangle of the quad has no area, so only the other is kept.
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

/** Whether the first quad of a middle ring faces in toward that ring's centre. */
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
  return vb.cross(vc).dot(va.clone().sub(centre)) < 0;
}

function flip(geo: THREE.BufferGeometry): void {
  const idx = geo.index!;
  for (let k = 0; k < idx.count; k += 3) {
    const b = idx.getX(k + 1);
    idx.setX(k + 1, idx.getX(k + 2));
    idx.setX(k + 2, b);
  }
}

/** One normal for the two copies of each seam point, and one for every copy of a pole. */
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
