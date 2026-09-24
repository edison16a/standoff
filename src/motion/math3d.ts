/**
 * The little bit of 3D math the controller needs. Plain objects instead of
 * a library, because this runs 60 times a second on a phone and only
 * needs rotating a vector by a quaternion.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  w: number;
  x: number;
  y: number;
  z: number;
}

export const DEG = Math.PI / 180;

export function vec(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function length(v: Vec3): number {
  return Math.sqrt(dot(v, v));
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/**
 * Builds the device to earth rotation from a `deviceorientation` event.
 * The spec defines alpha, beta and gamma as intrinsic Z, X', Y'' turns,
 * and this is the closed form of that product. Earth axes are x east,
 * y north, z up. Device axes are x to the right of the screen, y toward
 * the top edge, z out of the screen.
 */
export function quatFromDeviceEuler(alphaDeg: number, betaDeg: number, gammaDeg: number): Quat {
  const hx = (betaDeg * DEG) / 2;
  const hy = (gammaDeg * DEG) / 2;
  const hz = (alphaDeg * DEG) / 2;
  const [cx, sx] = [Math.cos(hx), Math.sin(hx)];
  const [cy, sy] = [Math.cos(hy), Math.sin(hy)];
  const [cz, sz] = [Math.cos(hz), Math.sin(hz)];
  return {
    w: cx * cy * cz - sx * sy * sz,
    x: sx * cy * cz - cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz + sx * sy * cz,
  };
}

/** Rotates v by q, taking a device frame vector into the earth frame. */
export function rotate(q: Quat, v: Vec3): Vec3 {
  // v' = v + 2w(q × v) + 2 q × (q × v), the usual cheap form.
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

/** Wraps an angle into the range -π to π. */
export function wrapAngle(angle: number): number {
  const wrapped = ((angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return wrapped - Math.PI;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
