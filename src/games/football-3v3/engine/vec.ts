/**
 * Plain vector helpers. The field is the x z plane with y up, in yards:
 * x runs end zone to end zone and z across the field, negative on the far
 * sideline and positive on the near one, where the TV camera sits.
 */

export interface Vec2 {
  x: number;
  z: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const v2 = (x = 0, z = 0): Vec2 => ({ x, z });
export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export const len = (a: Vec2): number => Math.hypot(a.x, a.z);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z });
export const add = (a: Vec2, b: Vec2, s = 1): Vec2 => ({ x: a.x + b.x * s, z: a.z + b.z * s });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, z: a.z * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.z * b.z;
/** The z part of a cross product: positive when b lies to the +z side of a turning from x. */
export const cross = (a: Vec2, b: Vec2): number => a.x * b.z - a.z * b.x;
export const fromAngle = (angle: number): Vec2 => ({ x: Math.cos(angle), z: Math.sin(angle) });
export const angleOf = (a: Vec2): number => Math.atan2(a.z, a.x);
/** Turned a quarter turn: +x becomes +z. */
export const perp = (a: Vec2): Vec2 => ({ x: -a.z, z: a.x });

/** The unit vector, or zero for a zero vector. */
export function norm(a: Vec2): Vec2 {
  const l = len(a);
  return l > 1e-9 ? { x: a.x / l, z: a.z / l } : { x: 0, z: 0 };
}

/** Caps a vector's length. */
export function clampLen(a: Vec2, max: number): Vec2 {
  const l = len(a);
  return l > max ? scale(a, max / l) : a;
}

/** The signed smallest turn from angle a to angle b. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
export const clamp01 = (v: number): number => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const len3 = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
export const dist3 = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const flat = (a: Vec3): Vec2 => ({ x: a.x, z: a.z });

export function norm3(a: Vec3): Vec3 {
  const l = len3(a);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 1, y: 0, z: 0 };
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

/** Distance from point p to the segment a b on the ground. */
export function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 > 1e-9 ? clamp01(dot(sub(p, a), ab) / l2) : 0;
  return dist(p, add(a, ab, t));
}
