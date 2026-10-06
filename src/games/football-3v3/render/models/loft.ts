import * as THREE from "three";

/**
 * Smooth body parts lofted through cross sections. A part is a list of
 * stations along its length; between them every measurement follows a
 * Catmull-Rom curve, so a calf swells and tapers instead of stepping.
 * Each ring of points goes round the part, so the surface comes out as
 * one smooth skin with its own texture coordinates.
 */

/** Half widths toward the model's left (+x) and right, half depths to the front (+z) and back. */
export interface Section {
  l: number;
  r: number;
  f: number;
  b: number;
  /** 2 is an ellipse; higher squares the corners off, as across shoulder pads. */
  p?: number;
}

/** A section at distance `t` along a part, its centre shifted by x and z. */
export interface Station extends Section {
  t: number;
  x?: number;
  z?: number;
  /** The ring's height when it is not simply `t` along the part, as over the flat top of shoulder pads. */
  y?: number;
}

/** The point at angle `a` round a section: 0 at the front (+z), a quarter turn at the model's left (+x). */
export function rim(s: Section, a: number): [number, number] {
  const e = 2 / (s.p ?? 2);
  const sn = Math.sin(a);
  const cs = Math.cos(a);
  return [Math.sign(sn) * Math.abs(sn) ** e * (sn >= 0 ? s.l : s.r), Math.sign(cs) * Math.abs(cs) ** e * (cs >= 0 ? s.f : s.b)];
}

const FIELDS = ["l", "r", "f", "b", "p", "x", "z", "y"] as const;

/** The station at `t`, on a Catmull-Rom curve through the keys. Never dips below the thinner neighbour, so no creases. */
export function sample(keys: readonly Station[], t: number): Required<Station> {
  let k = 0;
  while (k < keys.length - 2 && keys[k + 1]!.t < t) k++;
  const k1 = keys[k]!;
  const k2 = keys[Math.min(keys.length - 1, k + 1)]!;
  const k0 = keys[Math.max(0, k - 1)]!;
  const k3 = keys[Math.min(keys.length - 1, k + 2)]!;
  const u = k2.t === k1.t ? 0 : Math.min(1, Math.max(0, (t - k1.t) / (k2.t - k1.t)));
  const out = { t } as Required<Station>;
  for (const f of FIELDS) {
    const get = (s: Station) => (f === "p" ? (s.p ?? 2) : f === "y" ? (s.y ?? s.t) : (s[f] ?? 0));
    const [p0, p1, p2, p3] = [get(k0), get(k1), get(k2), get(k3)];
    const v = 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
    out[f] = f === "x" || f === "z" || f === "y" ? v : Math.max(Math.min(p1, p2) * 0.97, v);
  }
  return out;
}

/** A colour and how rough the surface is there (1 matte, near 0 glossy). */
export interface Paint {
  colour: THREE.ColorRepresentation;
  rough: number;
}

export interface TubeOptions {
  /** Ring angles; `angles(n)` makes an even ring. */
  ring: readonly number[];
  /** The most distance between rings. */
  step: number;
  /** Extra pairs of rings a hair apart at these distances, so a band of colour starts crisply. */
  cuts?: readonly number[];
  /** Rounded ends this tall beyond the first and last station, or none. */
  capStart?: number;
  capEnd?: number;
  /** Pushes the surface out at a point: a kneecap, a pec, a calf. */
  bump?: (t: number, a: number) => number;
  /** Lifts the ring at an angle: a V neck dips the front of the collar. */
  lift?: (t: number, a: number) => number;
  paint: (t: number, a: number) => Paint;
}

/** Gives stations given by height a `t` that runs along the surface, so rings spread evenly over a flat shelf too. */
export function along(keys: readonly Omit<Station, "t">[]): Station[] {
  let t = 0;
  return keys.map((k, i) => {
    const prev = keys[i - 1];
    if (prev) t += Math.hypot((k.y ?? 0) - (prev.y ?? 0), Math.max(k.l, k.r) - Math.max(prev.l, prev.r));
    return { ...k, t };
  });
}

/** `n` angles evenly round, starting at `a0`, with extra angles a hair either side of each cut for crisp stripes. */
export function angles(n: number, cuts: readonly number[] = [], a0 = 0): number[] {
  const out: number[] = [];
  for (let j = 0; j < n; j++) out.push(a0 + (j / n) * Math.PI * 2);
  const wrap = (a: number) => a0 + ((((a - a0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
  for (const c of cuts) out.push(wrap(c - 0.004), wrap(c + 0.004));
  return out.sort((a, b) => a - b);
}

const colour = new THREE.Color();

/**
 * A part as a tube from `origin` along `dir` (-1 down a limb, 1 up a
 * torso). Faces point outward; the seam's normals are shared; `u` runs
 * round each ring from its first angle and `v` along the part.
 */
export function tube(origin: THREE.Vector3, dir: 1 | -1, keys: readonly Station[], o: TubeOptions): THREE.BufferGeometry {
  const t0 = keys[0]!.t;
  const t1 = keys[keys.length - 1]!.t;
  const steps = Math.max(2, Math.ceil(Math.abs(t1 - t0) / o.step));
  const ts: number[] = [];
  for (let i = 0; i <= steps; i++) ts.push(t0 + ((t1 - t0) * i) / steps);
  for (const c of o.cuts ?? []) if (c > t0 && c < t1) ts.push(c - 0.0015, c + 0.0015);
  ts.sort((a, b) => a - b);
  // Each ring: its distance along, how far toward the pole a dome squeezes it, and where it sits.
  const rings: { t: number; squeeze: number; at: number }[] = [];
  const dome = (end: number, h: number, outward: number) => [1, 2, 3].map((i) => {
    const th = (i / 4) * (Math.PI / 2);
    return { t: end, squeeze: Math.cos(th), at: end + outward * h * Math.sin(th) };
  });
  if (o.capStart) rings.push(...dome(t0, o.capStart, -Math.sign(t1 - t0)).reverse());
  for (const t of ts) rings.push({ t, squeeze: 1, at: t });
  if (o.capEnd) rings.push(...dome(t1, o.capEnd, Math.sign(t1 - t0)));

  // Without explicit heights a ring sits at its own distance along; with them, at the curve through them.
  const hasY = keys.some((k) => k.y !== undefined);
  const height = (s: Required<Station>, t: number, at: number) => dir * (hasY ? s.y + at - t : at);
  const n = o.ring.length;
  const cols = n + 1;
  const poles = (o.capStart ? 1 : 0) + (o.capEnd ? 1 : 0);
  const rows = rings.length + poles;
  const pos = new Float32Array(rows * cols * 3);
  const uv = new Float32Array(rows * cols * 2);
  const col = new Float32Array(rows * cols * 3);
  const rough = new Float32Array(rows * cols);
  let row = 0;
  const put = (i: number, x: number, y: number, z: number, u: number, v: number, t: number, a: number) => {
    pos.set([x, y, z], i * 3);
    uv.set([u, v], i * 2);
    const p = o.paint(t, a);
    colour.set(p.colour);
    col.set([colour.r, colour.g, colour.b], i * 3);
    rough[i] = p.rough;
  };
  const vOf = (at: number) => Math.min(1, Math.max(0, (at - t0) / (t1 - t0 || 1)));
  const pole = (t: number, at: number) => {
    const s = sample(keys, t);
    for (let j = 0; j < cols; j++) put(row * cols + j, origin.x + s.x, origin.y + height(s, t, at), origin.z + s.z, j / n, vOf(at), t, o.ring[j % n]!);
    row++;
  };
  if (o.capStart) pole(t0, t0 - Math.sign(t1 - t0) * o.capStart);
  for (const r of rings) {
    const s = sample(keys, r.t);
    for (let j = 0; j < cols; j++) {
      const a = o.ring[j % n]!;
      const [x, z] = rim(s, a);
      const push = o.bump ? o.bump(r.t, a) : 0;
      const len = Math.hypot(x, z) || 1;
      const k = r.squeeze;
      const y = origin.y + height(s, r.t, r.at) + (o.lift ? o.lift(r.t, a) : 0);
      put(row * cols + j, origin.x + s.x + (x + (x / len) * push) * k, y, origin.z + s.z + (z + (z / len) * push) * k, j / n, vOf(r.at), r.t, a);
    }
    row++;
  }
  if (o.capEnd) pole(t1, t1 + Math.sign(t1 - t0) * o.capEnd);

  const index: number[] = [];
  const startPole = !!o.capStart;
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < n; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      // Beside a pole one triangle of the quad has no area, so only the other is kept.
      if (!(startPole && i === 0)) index.push(a, b, d);
      if (!(o.capEnd && i === rows - 2)) index.push(a, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("rough", new THREE.BufferAttribute(rough, 1));
  geo.setIndex(index);
  // Rings run up a torso and down a limb, so the winding flips with the direction.
  if ((dir > 0) !== (t1 > t0)) flip(geo);
  geo.computeVertexNormals();
  weldSeam(geo, rows, cols, startPole, !!o.capEnd);
  return geo;
}

/** Reverses every triangle, so the faces point the other way. */
export function flip(geo: THREE.BufferGeometry): void {
  const idx = geo.index!;
  for (let k = 0; k < idx.count; k += 3) {
    const b = idx.getX(k + 1);
    idx.setX(k + 1, idx.getX(k + 2));
    idx.setX(k + 2, b);
  }
  idx.needsUpdate = true;
}

const sum = new THREE.Vector3();
const tmp = new THREE.Vector3();

/** One normal for both copies of each seam point, and one for every copy of a pole. */
function weldSeam(geo: THREE.BufferGeometry, rows: number, cols: number, startPole: boolean, endPole: boolean): void {
  const nrm = geo.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < rows; i++) {
    const first = i * cols;
    const last = first + cols - 1;
    const pole = (i === 0 && startPole) || (i === rows - 1 && endPole);
    if (pole) {
      sum.set(0, 0, 0);
      for (let j = first; j <= last; j++) sum.add(tmp.fromBufferAttribute(nrm, j));
      sum.normalize();
      for (let j = first; j <= last; j++) nrm.setXYZ(j, sum.x, sum.y, sum.z);
      continue;
    }
    sum.fromBufferAttribute(nrm, first).add(tmp.fromBufferAttribute(nrm, last)).normalize();
    nrm.setXYZ(first, sum.x, sum.y, sum.z);
    nrm.setXYZ(last, sum.x, sum.y, sum.z);
  }
  nrm.needsUpdate = true;
}
