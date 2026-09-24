/** Small vector helpers. Positions on the floor are {x, z}; in the air they add y. */

export interface V2 {
  x: number;
  z: number;
}

export interface V3 {
  x: number;
  y: number;
  z: number;
}

export const dist2 = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.z - b.z);

export const dist3 = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Unit vector from a to b on the floor, or zero when they coincide. */
export function dir2(a: V2, b: V2): V2 {
  const d = dist2(a, b);
  return d < 1e-6 ? { x: 0, z: 0 } : { x: (b.x - a.x) / d, z: (b.z - a.z) / d };
}

/** Facing angle for a floor direction: 0 faces +z, toward the camera. */
export const yawOf = (x: number, z: number) => Math.atan2(x, z);

/** Shortest signed turn from angle a to angle b. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance from point p to the segment a to b, on the floor, and how far along it the nearest point is. */
export function segmentDistance(p: V2, a: V2, b: V2): { d: number; t: number } {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const l2 = abx * abx + abz * abz;
  const t = l2 < 1e-9 ? 0 : clamp(((p.x - a.x) * abx + (p.z - a.z) * abz) / l2, 0, 1);
  return { d: Math.hypot(p.x - (a.x + abx * t), p.z - (a.z + abz * t)), t };
}
