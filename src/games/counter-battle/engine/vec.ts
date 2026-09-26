/** A point on the arena floor: x across, z along the field from one base to the other. */
export interface V2 {
  x: number;
  z: number;
}

/** A point in the arena, y up, metres. */
export interface V3 {
  x: number;
  y: number;
  z: number;
}

export const v2 = (x: number, z: number): V2 => ({ x, z });
export const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });

export const add = (a: V2, b: V2): V2 => ({ x: a.x + b.x, z: a.z + b.z });
export const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, z: a.z - b.z });
export const scale = (a: V2, k: number): V2 => ({ x: a.x * k, z: a.z * k });
export const dot = (a: V2, b: V2): number => a.x * b.x + a.z * b.z;
export const len = (a: V2): number => Math.hypot(a.x, a.z);
export const dist = (a: V2, b: V2): number => Math.hypot(a.x - b.x, a.z - b.z);
export const lerp2 = (a: V2, b: V2, t: number): V2 => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });

export function norm(a: V2): V2 {
  const l = len(a);
  return l > 1e-9 ? { x: a.x / l, z: a.z / l } : { x: 0, z: 0 };
}

/** The floor point under a 3D point. */
export const flat = (a: V3): V2 => ({ x: a.x, z: a.z });
export const at = (a: V2, y: number): V3 => ({ x: a.x, y, z: a.z });
export const dist3 = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Heading of a direction, 0 facing +z, turning toward +x. */
export const yawOf = (d: V2): number => Math.atan2(d.x, d.z);
export const dirOf = (yaw: number): V2 => ({ x: Math.sin(yaw), z: Math.cos(yaw) });

/** The signed shortest turn from one heading to another, in (-pi, pi]. */
export function turnTo(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** A direction from yaw and pitch (pitch up is positive). */
export function dir3(yaw: number, pitch: number): V3 {
  const c = Math.cos(pitch);
  return { x: Math.sin(yaw) * c, y: Math.sin(pitch), z: Math.cos(yaw) * c };
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
