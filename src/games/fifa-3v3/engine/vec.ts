/**
 * Plain vector helpers. The pitch is the x z plane with y up: x runs
 * goal to goal and z runs from the far side (negative) to the near side,
 * where the TV camera sits.
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

export function len(a: Vec2): number {
  return Math.hypot(a.x, a.z);
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, z: a.z - b.z };
}

export function add(a: Vec2, b: Vec2, scale = 1): Vec2 {
  return { x: a.x + b.x * scale, z: a.z + b.z * scale };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, z: a.z * s };
}

/** The unit vector, or zero for a zero vector. */
export function norm(a: Vec2): Vec2 {
  const l = len(a);
  return l > 1e-9 ? { x: a.x / l, z: a.z / l } : { x: 0, z: 0 };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.z * b.z;
}

/** Caps a vector's length. */
export function clampLen(a: Vec2, max: number): Vec2 {
  const l = len(a);
  return l > max ? scale(a, max / l) : a;
}

export function fromAngle(angle: number): Vec2 {
  return { x: Math.cos(angle), z: Math.sin(angle) };
}

export function angleOf(a: Vec2): number {
  return Math.atan2(a.z, a.x);
}

/** The signed smallest turn from angle a to angle b. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
