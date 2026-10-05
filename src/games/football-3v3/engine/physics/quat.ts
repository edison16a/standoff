import type { V3 } from "../vec";

/**
 * Unit quaternions for the ball's orientation. Plain functions on plain
 * objects, so the engine stays free of three.js and a still of the
 * match is just numbers.
 */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export const IDENTITY: Readonly<Quat> = { x: 0, y: 0, z: 0, w: 1 };

export function qMul(a: Quat, b: Quat): Quat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function qNorm(q: Quat): Quat {
  const l = Math.hypot(q.x, q.y, q.z, q.w);
  return l < 1e-12 ? { ...IDENTITY } : { x: q.x / l, y: q.y / l, z: q.z / l, w: q.w / l };
}

/** Rotates v by q (body to world). */
export function qRotate(q: Quat, v: V3): V3 {
  // v + 2w (u x v) + 2 u x (u x v), with u the vector part.
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

/** Rotates v by the inverse of q (world to body). */
export function qUnrotate(q: Quat, v: V3): V3 {
  return qRotate({ x: -q.x, y: -q.y, z: -q.z, w: q.w }, v);
}

/** A turn of `angle` radians about a unit axis. */
export function qAxisAngle(axis: V3, angle: number): Quat {
  const s = Math.sin(angle / 2);
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(angle / 2) };
}

/** The shortest turn that takes unit vector `from` onto unit vector `to`. */
export function qFromTo(from: V3, to: V3): Quat {
  const d = from.x * to.x + from.y * to.y + from.z * to.z;
  if (d < -0.999999) {
    // Opposite: half a turn about any axis at right angles to `from`.
    const side = Math.abs(from.x) < 0.9 ? { x: 0, y: -from.z, z: from.y } : { x: from.z, y: 0, z: -from.x };
    const l = Math.hypot(side.x, side.y, side.z);
    return { x: side.x / l, y: side.y / l, z: side.z / l, w: 0 };
  }
  return qNorm({ x: from.y * to.z - from.z * to.y, y: from.z * to.x - from.x * to.z, z: from.x * to.y - from.y * to.x, w: 1 + d });
}

/**
 * Turns q by a world angular velocity w held for dt seconds, with the
 * exact rotation for that step (no small angle shortcut), so a ball
 * spinning ten times a second stays a unit quaternion and keeps its energy.
 */
export function qSpin(q: Quat, w: V3, dt: number): Quat {
  const rate = Math.hypot(w.x, w.y, w.z);
  if (rate * dt < 1e-12) return q;
  const turn = qAxisAngle({ x: w.x / rate, y: w.y / rate, z: w.z / rate }, rate * dt);
  return qNorm(qMul(turn, q));
}

/** Spherical blend from a to b, for slow motion replays. */
export function qSlerp(a: Quat, b: Quat, t: number): Quat {
  let d = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  const s = d < 0 ? -1 : 1;
  d *= s;
  if (d > 0.9995) return qNorm({ x: a.x + (s * b.x - a.x) * t, y: a.y + (s * b.y - a.y) * t, z: a.z + (s * b.z - a.z) * t, w: a.w + (s * b.w - a.w) * t });
  const th = Math.acos(d);
  const ka = Math.sin((1 - t) * th) / Math.sin(th);
  const kb = (s * Math.sin(t * th)) / Math.sin(th);
  return { x: a.x * ka + b.x * kb, y: a.y * ka + b.y * kb, z: a.z * ka + b.z * kb, w: a.w * ka + b.w * kb };
}
