import * as THREE from "three";
import { egg, loft } from "./loft";

/**
 * A tube up or down the body from keyed cross sections: a thigh is a
 * handful of keys (the hip, the quads, above the knee, the knee) and the
 * rings between them are eased so the outline flows without bumps.
 */

/** One cross section at height `y`: half widths left and right, half depths front and back, and the centre's offset. */
export interface Key {
  y: number;
  l: number;
  r: number;
  f: number;
  b: number;
  /** Above 2 squares the section off. */
  power?: number;
  x?: number;
  z?: number;
}

export interface TubeOptions {
  /** Points round each ring. */
  n: number;
  /** The longest gap between rings, in metres. */
  step: number;
  /** Rounds the first or last end over into a dome this deep, closed on a point. */
  capStart?: number;
  capEnd?: number;
  /** The angle of each ring's first point, where the uv seam falls: hide it where nobody looks. */
  a0?: number;
}

type Field = "l" | "r" | "f" | "b" | "power" | "x" | "z";
const FIELDS: readonly Field[] = ["l", "r", "f", "b", "power", "x", "z"];
const read = (k: Key, f: Field) => (f === "power" ? (k.power ?? 2) : f === "x" ? (k.x ?? 0) : f === "z" ? (k.z ?? 0) : k[f]);

/**
 * A value between keys on a curve through all of them that never
 * overshoots: where the outline turns (the widest point of a calf) the
 * curve is flat, so no ripple appears beside it.
 */
function ease(keys: readonly Key[], f: Field, i: number, u: number): number {
  const slope = (j: number) => {
    const a = keys[j - 1];
    const b = keys[j + 1];
    const k = keys[j]!;
    if (!a || !b) return 0;
    const s1 = (read(k, f) - read(a, f)) / (k.y - a.y);
    const s2 = (read(b, f) - read(k, f)) / (b.y - k.y);
    return s1 * s2 <= 0 ? 0 : (s1 + s2) / 2;
  };
  const k1 = keys[i]!;
  const k2 = keys[i + 1]!;
  const span = k2.y - k1.y;
  const h00 = 2 * u ** 3 - 3 * u * u + 1;
  const h10 = u ** 3 - 2 * u * u + u;
  const h01 = -2 * u ** 3 + 3 * u * u;
  const h11 = u ** 3 - u * u;
  return h00 * read(k1, f) + h10 * span * slope(i) + h01 * read(k2, f) + h11 * span * slope(i + 1);
}

/** The eased section at a point `u` of the way through key gap `i`. */
function sectionAt(keys: readonly Key[], i: number, u: number): Key {
  const out = { y: keys[i]!.y + (keys[i + 1]!.y - keys[i]!.y) * u } as Key;
  for (const f of FIELDS) out[f] = ease(keys, f, i, u);
  return out;
}

function ring(k: Key, n: number, a0: number, scale = 1, dy = 0): THREE.Vector3[] {
  const shape = egg(k.l * scale, k.r * scale, k.f * scale, k.b * scale, k.power ?? 2);
  const out: THREE.Vector3[] = [];
  for (let j = 0; j < n; j++) {
    const [x, z] = shape(a0 + (j / n) * Math.PI * 2);
    out.push(new THREE.Vector3((k.x ?? 0) + x, k.y + dy, (k.z ?? 0) + z));
  }
  return out;
}

/** Rings rounding over from `k` into a dome `depth` deep toward `dir` (+1 up, -1 down), ending on its pole. */
function dome(k: Key, n: number, a0: number, depth: number, dir: number): { rings: THREE.Vector3[][]; pole: THREE.Vector3 } {
  const rings: THREE.Vector3[][] = [];
  const steps = 4;
  for (let s = 1; s < steps; s++) {
    const th = (s / steps) * (Math.PI / 2);
    rings.push(ring(k, n, a0, Math.cos(th), dir * depth * Math.sin(th)));
  }
  return { rings, pole: new THREE.Vector3(k.x ?? 0, k.y + dir * depth, k.z ?? 0) };
}

/** The tube through the keys, in order (up or down). `u` runs round from the front, `v` from the first key to the last. */
export function tube(keys: readonly Key[], o: TubeOptions): THREE.BufferGeometry {
  const rings: THREE.Vector3[][] = [];
  const a0 = o.a0 ?? 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const gap = Math.abs(keys[i + 1]!.y - keys[i]!.y);
    const count = Math.max(1, Math.ceil(gap / o.step));
    for (let s = 0; s < count; s++) rings.push(ring(sectionAt(keys, i, s / count), o.n, a0));
  }
  rings.push(ring(keys[keys.length - 1]!, o.n, a0));
  const dir = Math.sign(keys[keys.length - 1]!.y - keys[0]!.y) || 1;
  const caps: { start?: THREE.Vector3; end?: THREE.Vector3 } = {};
  if (o.capStart) {
    const d = dome(keys[0]!, o.n, a0, o.capStart, -dir);
    rings.unshift(...d.rings.reverse());
    caps.start = d.pole;
  }
  if (o.capEnd) {
    const d = dome(keys[keys.length - 1]!, o.n, a0, o.capEnd, dir);
    rings.push(...d.rings);
    caps.end = d.pole;
  }
  return loft(rings, caps);
}
