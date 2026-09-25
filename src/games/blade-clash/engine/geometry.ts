import { dot, length, scale, sub, type Vec3 } from "@/games/kit/motion/math3d";

export type { Vec3 };

/** A straight piece of something: a blade, or the core of a body part. */
export interface Segment {
  a: Vec3;
  b: Vec3;
}

/** A body part for hit tests: every point within `radius` of the segment. */
export interface Capsule extends Segment {
  radius: number;
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function lerpVec(a: Vec3, b: Vec3, k: number): Vec3 {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
}

export function normalize(v: Vec3): Vec3 {
  const size = length(v);
  return size > 1e-9 ? scale(v, 1 / size) : { x: 1, y: 0, z: 0 };
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

export function pointOn(segment: Segment, s: number): Vec3 {
  return lerpVec(segment.a, segment.b, s);
}

/** The nearest points of two segments, as fractions along each, and how far apart they are. */
export interface Closest {
  s: number;
  t: number;
  distance: number;
}

/**
 * Closest points between two segments, after Ericson's Real-Time
 * Collision Detection. Handles parallel and zero length segments, which
 * blades held together or a sphere written as a capsule both produce.
 */
export function closestBetween(p: Segment, q: Segment): Closest {
  const d1 = sub(p.b, p.a);
  const d2 = sub(q.b, q.a);
  const r = sub(p.a, q.a);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  const tiny = 1e-12;
  let s = 0;
  let t = 0;
  if (a <= tiny && e <= tiny) {
    s = 0;
    t = 0;
  } else if (a <= tiny) {
    t = clamp01(f / e);
  } else {
    const c = dot(d1, r);
    if (e <= tiny) {
      s = clamp01(-c / a);
    } else {
      const b = dot(d1, d2);
      const denom = a * e - b * b;
      s = denom > tiny ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  return { s, t, distance: distance(pointOn(p, s), pointOn(q, t)) };
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
