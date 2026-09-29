/** Small vector helpers. Ground positions are {x, z}; in the air they add y. */

export interface V2 {
  x: number;
  z: number;
}

export interface V3 {
  x: number;
  y: number;
  z: number;
}

export const ZERO2: Readonly<V2> = { x: 0, z: 0 };

export const len2 = (v: V2) => Math.hypot(v.x, v.z);

export const dist2 = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.z - b.z);

export const dist3 = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export const len3 = (v: V3) => Math.hypot(v.x, v.y, v.z);

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Unit vector, or zero for a vector too short to have a direction. */
export function norm2(v: V2): V2 {
  const l = len2(v);
  return l < 1e-9 ? { x: 0, z: 0 } : { x: v.x / l, z: v.z / l };
}

export function norm3(v: V3): V3 {
  const l = len3(v);
  return l < 1e-9 ? { x: 1, y: 0, z: 0 } : { x: v.x / l, y: v.y / l, z: v.z / l };
}

/** Unit vector from a to b on the ground, or zero when they coincide. */
export const dir2 = (a: V2, b: V2): V2 => norm2({ x: b.x - a.x, z: b.z - a.z });

export const dot2 = (a: V2, b: V2) => a.x * b.x + a.z * b.z;

export const dot3 = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;

export const cross3 = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

/** Facing angle for a ground direction: 0 faces +z, and +x is a quarter turn. */
export const yawOf = (x: number, z: number) => Math.atan2(x, z);

export const fromYaw = (yaw: number): V2 => ({ x: Math.sin(yaw), z: Math.cos(yaw) });

/** Shortest signed turn from angle a to angle b. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance from p to the segment a to b, and how far along it (0 to 1) the nearest point is. */
export function segmentDistance(p: V2, a: V2, b: V2): { d: number; t: number } {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const l2 = abx * abx + abz * abz;
  const t = l2 < 1e-9 ? 0 : clamp(((p.x - a.x) * abx + (p.z - a.z) * abz) / l2, 0, 1);
  return { d: Math.hypot(p.x - (a.x + abx * t), p.z - (a.z + abz * t)), t };
}
