import * as THREE from "three";

export type V3 = [number, number, number];

/**
 * Where a hand sits and how closed it is, in the gun's own frame. The
 * origin is the middle of the palm's surface, so a pose that puts it on a
 * part's surface with the palm facing in lays the hand flat on it.
 */
export type HandPose = {
  pos: V3;
  /** Euler angles in XYZ order. */
  rot: V3;
  /** How far the middle, ring and little fingers close: 0 flat, 1 a fist. */
  curl: number;
  /** The index finger alone, so it can rest on the trigger or point along the frame. */
  index: number;
  /** 0 the thumb lies out alongside the hand, 1 it wraps across the palm. */
  thumb: number;
};

/** A loose part's offset and whether it shows. `shown` is a number so poses can be mixed; it shows above a half. */
export type PartPose = {
  pos: V3;
  rot: V3;
  shown: number;
};

/**
 * Everything the rig needs to draw one frame of the held gun, apart from
 * where it points and the recoil, which ride on top. Travel values are a
 * share of each part's full stroke, so the poses stay in the units a
 * person thinks in and the rig turns them into distances.
 */
export type GunPose = {
  /** The whole gun's offset in its own frame: the reload's lift and roll, and the jolts. */
  body: { pos: V3; rot: V3 };
  /** The gun's own magazine, as an offset from its home in the well. */
  mag: PartPose;
  /** The fresh magazine, as an offset from the magazine's home. */
  spare: PartPose;
  /** The shotgun's loose shell, placed in the gun's frame. */
  shell: PartPose;
  /** The bolt or carrier, 0 closed to 1 fully back with the ejection port open. */
  carrier: number;
  /** Charging or cocking handle, 0 forward to 1 fully back. */
  handle: number;
  /** The MP5 handle turned up into its notch. */
  handleLock: number;
  /** The shotgun's fore end, 0 forward to 1 racked back. */
  pump: number;
  /** The AR's dust cover, 0 shut to 1 open. */
  cover: number;
  /** The left hand, which does the reload work. */
  support: HandPose;
  /** The right hand on the grip. */
  grip: HandPose;
  /** True once the empty magazine has been let go, so the rig can drop a copy of it. */
  dropped: boolean;
};

/** A value that can be blended: numbers, tuples of numbers, and objects of those. */
export type Mixable = number | boolean | readonly number[] | { readonly [key: string]: Mixable };

/**
 * Blends two poses of the same shape, `w` of the way from `a` to `b`.
 * Euler angles are blended as numbers, which is close enough for the
 * small turns between neighbouring keys. Flags switch at the halfway point.
 */
export function mix<T extends Mixable>(a: T, b: T, w: number): T {
  if (typeof a === "number") return (a + ((b as number) - a) * w) as T;
  if (typeof a === "boolean") return (w < 0.5 ? a : b) as T;
  if (Array.isArray(a)) return a.map((v: number, i) => v + ((b as readonly number[])[i]! - v) * w) as unknown as T;
  const out: Record<string, Mixable> = {};
  for (const key of Object.keys(a)) out[key] = mix((a as Record<string, Mixable>)[key]!, (b as Record<string, Mixable>)[key]!, w);
  return out as T;
}

const basis = new THREE.Matrix4();
const euler = new THREE.Euler();
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const vec = new THREE.Vector3();

/**
 * The turn that lays a hand with its palm facing `palm` and its fingers
 * reaching along `fingers`. Thinking in those two directions is how a
 * person places a hand on a part, and far easier than raw angles.
 */
export function handRot(palm: V3, fingers: V3): V3 {
  const y = new THREE.Vector3(...palm).normalize().negate();
  const reach = new THREE.Vector3(...fingers);
  // Keep the fingers square to the palm, whatever was asked.
  const z = reach.sub(y.clone().multiplyScalar(reach.dot(y))).normalize().negate();
  const x = new THREE.Vector3().crossVectors(y, z);
  euler.setFromRotationMatrix(basis.makeBasis(x, y, z));
  return [euler.x, euler.y, euler.z];
}

/**
 * A hand held to a moving part: `grip` is the hand's pose in the part's
 * frame, and the result is in the gun's frame. The hand then follows the
 * part exactly, the way it would really be holding it.
 */
export function attach(partPos: V3, partRot: V3, grip: HandPose): HandPose {
  qa.setFromEuler(euler.set(...partRot));
  vec.set(...grip.pos).applyQuaternion(qa).add(new THREE.Vector3(...partPos));
  qb.setFromEuler(euler.set(...grip.rot));
  euler.setFromQuaternion(qa.multiply(qb));
  return { ...grip, pos: [vec.x, vec.y, vec.z], rot: [euler.x, euler.y, euler.z] };
}

/** Sums two offsets, for layering a nudge on a pose. */
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
