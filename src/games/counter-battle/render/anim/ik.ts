import * as THREE from "three";

/**
 * Two bone IK: points a limb's upper joint and bends its middle joint so
 * the end lands on a target, with the middle joint swung toward a pole
 * (the knee forward, the elbow down and out). Limbs hang down their
 * joint's -y and the middle joint only turns about its own x, so the
 * whole answer is one orientation and one angle.
 */

const Y = new THREE.Vector3();
const Z = new THREE.Vector3();
const X = new THREE.Vector3();
const t = new THREE.Vector3();
const p = new THREE.Vector3();
const u = new THREE.Vector3();
const f = new THREE.Vector3();
const elbow = new THREE.Vector3();
const basis = new THREE.Matrix4();

export interface Limb {
  upper: THREE.Object3D;
  middle: THREE.Object3D;
  /** Upper and lower bone lengths. */
  a: number;
  b: number;
  /** +1 for a knee (the lower bone swings back, a positive turn), -1 for an elbow. */
  bend: 1 | -1;
}

/**
 * Solves one limb. `target` and `pole` are in the space of the upper
 * joint's parent. Returns how far the target was out of reach (0 if it
 * could be reached), which tests use to check poses stay natural.
 */
export function solveLimb(limb: Limb, target: THREE.Vector3, pole: THREE.Vector3): number {
  const { a, b } = limb;
  t.copy(target).sub(limb.upper.position);
  const want = t.length();
  const d = THREE.MathUtils.clamp(want, Math.abs(a - b) + 1e-4, a + b - 1e-4);
  if (want < 1e-6) t.set(0, -1, 0);
  t.normalize();
  // The part of the pole square to the reach line says which way the joint bends out.
  p.copy(pole).addScaledVector(t, -pole.dot(t));
  if (p.lengthSq() < 1e-10) p.set(0, 0, 1).addScaledVector(t, -t.z);
  p.normalize();
  const cosA = THREE.MathUtils.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  u.copy(t).multiplyScalar(cosA).addScaledVector(p, sinA).normalize();
  elbow.copy(u).multiplyScalar(a);
  f.copy(t).multiplyScalar(d).sub(elbow).normalize();
  // The upper bone's frame: -y along the bone, z in the bend plane toward where the lower bone swings.
  Y.copy(u).negate();
  Z.copy(f).addScaledVector(u, -f.dot(u));
  if (Z.lengthSq() < 1e-10) Z.copy(p);
  Z.normalize().multiplyScalar(-limb.bend);
  X.crossVectors(Y, Z).normalize();
  Z.crossVectors(X, Y).normalize();
  basis.makeBasis(X, Y, Z);
  limb.upper.quaternion.setFromRotationMatrix(basis);
  const angle = Math.acos(THREE.MathUtils.clamp(u.dot(f), -1, 1));
  limb.middle.rotation.set(limb.bend * angle, 0, 0);
  return Math.max(0, want - (a + b));
}
