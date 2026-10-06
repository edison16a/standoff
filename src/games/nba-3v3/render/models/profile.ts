import * as THREE from "three";
import { egg, loft, ringY } from "./loft";

/**
 * One station along a body part: at distance `t` the half widths to the
 * model's left and right, the half depths to the front and back, how
 * far the centre sits forward, and how square the section is.
 */
export interface Key {
  t: number;
  l: number;
  r: number;
  f: number;
  b: number;
  z?: number;
  power?: number;
}

type Full = Required<Key>;

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** A Catmull-Rom curve through the keys, so a muscle swells and tapers smoothly instead of in straight steps. */
export function sample(keys: readonly Key[], t: number): Full {
  let k = 0;
  while (k < keys.length - 2 && keys[k + 1]!.t < t) k++;
  const k1 = keys[k]!;
  const k2 = keys[Math.min(keys.length - 1, k + 1)]!;
  const k0 = keys[Math.max(0, k - 1)]!;
  const k3 = keys[Math.min(keys.length - 1, k + 2)]!;
  const u = Math.min(1, Math.max(0, k2.t === k1.t ? 0 : (t - k1.t) / (k2.t - k1.t)));
  const cr = (f: (q: Key) => number) => {
    const [p0, p1, p2, p3] = [f(k0), f(k1), f(k2), f(k3)];
    const v = 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
    // Never overshoot below the thinner neighbour: a dip would read as a crease.
    return Math.max(Math.min(p1, p2) * 0.97, v);
  };
  return {
    t,
    l: cr((q) => q.l),
    r: cr((q) => q.r),
    f: cr((q) => q.f),
    b: cr((q) => q.b),
    z: lerp(k1.z ?? 0, k2.z ?? 0, u * u * (3 - 2 * u)),
    power: lerp(k1.power ?? 2, k2.power ?? 2, u),
  };
}

/** Scales a set of keys: lengths by `len`, widths by `wide`, depths by `deep`. */
export function scaleKeys(keys: readonly Key[], len: number, wide: number, deep = wide): Key[] {
  return keys.map((k) => ({ ...k, t: k.t * len, l: k.l * wide, r: k.r * wide, f: k.f * deep, b: k.b * deep, z: (k.z ?? 0) * deep }));
}

/** Swaps the left and right halves, for the other arm or leg. */
export function mirrorKeys(keys: readonly Key[]): Key[] {
  return keys.map((k) => ({ ...k, l: k.r, r: k.l }));
}

export interface TubeOptions {
  /** Points round each ring. */
  n: number;
  /** The most distance between rings. */
  step: number;
  /** Where the tube starts and ends along `t`; the keys' own ends by default. */
  from?: number;
  to?: number;
  /** A rounded end of this height beyond each end, or none. */
  capStart?: number;
  capEnd?: number;
  /** Added to every radius, for a sleeve or a sock over the skin. */
  inflate?: number;
  /** An extra push out at a point of the surface, for a pec or a kneecap. */
  bump?: (t: number, a: number) => number;
  /** The angle the rings start at, which sets where the uv seam falls. */
  a0?: number;
}

/**
 * A body part as a smooth vertical tube from `origin`: `t` runs down
 * from it (`dir` -1, a limb) or up (`dir` 1, a torso). The keys shape it
 * along its length and the ends close in rounded domes.
 */
export function tube(origin: THREE.Vector3, dir: 1 | -1, keys: readonly Key[], o: TubeOptions): THREE.BufferGeometry {
  const from = o.from ?? keys[0]!.t;
  const to = o.to ?? keys[keys.length - 1]!.t;
  const steps = Math.max(2, Math.ceil(Math.abs(to - from) / o.step));
  const grow = o.inflate ?? 0;
  const ring = (t: number, scale: number, at = t) => {
    const k = sample(keys, t);
    const base = egg(k.l + grow, k.r + grow, k.f + grow, k.b + grow, k.power);
    const shape = (a: number): [number, number] => {
      const [x, z] = base(a);
      const push = o.bump ? o.bump(t, a) : 0;
      const len = Math.hypot(x, z) || 1;
      return [(x + (x / len) * push) * scale, (z + (z / len) * push) * scale];
    };
    return ringY(origin.x, origin.y + dir * at, origin.z + k.z, o.n, shape, o.a0 ?? 0);
  };
  const rings: THREE.Vector3[][] = [];
  const dome = (end: number, h: number, outward: number, reverse: boolean) => {
    const out: THREE.Vector3[][] = [];
    for (let i = 1; i <= 3; i++) {
      const th = (i / 4) * (Math.PI / 2);
      out.push(ring(end, Math.cos(th), end + outward * h * Math.sin(th)));
    }
    return reverse ? out.reverse() : out;
  };
  const sign = Math.sign(to - from) || 1;
  if (o.capStart) rings.push(...dome(from, o.capStart, -sign, true));
  for (let i = 0; i <= steps; i++) rings.push(ring(from + ((to - from) * i) / steps, 1));
  if (o.capEnd) rings.push(...dome(to, o.capEnd, sign, false));
  const pole = (t: number, k: Full) => new THREE.Vector3(origin.x, origin.y + dir * t, origin.z + k.z);
  return loft(rings, {
    start: o.capStart ? pole(from - sign * o.capStart, sample(keys, from)) : undefined,
    end: o.capEnd ? pole(to + sign * o.capEnd, sample(keys, to)) : undefined,
  });
}
