import * as THREE from "three";

/** Where a two bone limb's middle joint and end land. */
export interface Limb {
  joint: THREE.Vector3;
  end: THREE.Vector3;
  /** The way the joint bends, square to the limb. */
  bend: THREE.Vector3;
  /** Target distance over full reach: above 1 the limb had to fall short. */
  stretch: number;
}

/** `dir` with its part along `axis` taken out, normalised. When nothing is left, any direction square to `axis`. */
export function flatten(dir: THREE.Vector3, axis: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
  const along = dir.dot(axis);
  out.copy(dir).addScaledVector(axis, -along);
  if (out.lengthSq() > 1e-10) return out.normalize();
  out.set(Math.abs(axis.y) < 0.9 ? 0 : 1, Math.abs(axis.y) < 0.9 ? 1 : 0, 0);
  return out.cross(axis).normalize();
}

const aim = new THREE.Vector3();

/**
 * Two bone inverse kinematics: where the knee or elbow goes so the limb
 * reaches `target` from `root`, bending toward `pole`. Out of reach it
 * straightens and stops short, and `stretch` says by how much.
 */
export function twoBone(root: THREE.Vector3, target: THREE.Vector3, upper: number, lower: number, pole: THREE.Vector3, out?: Limb): Limb {
  const limb = out ?? { joint: new THREE.Vector3(), end: new THREE.Vector3(), bend: new THREE.Vector3(), stretch: 1 };
  const toTarget = aim.copy(target).sub(root);
  const want = toTarget.length();
  const reach = Math.min(upper + lower - 1e-4, Math.max(Math.abs(upper - lower) + 1e-4, want));
  const dir = want > 1e-6 ? toTarget.divideScalar(want) : toTarget.set(0, -1, 0);
  flatten(pole, dir, limb.bend);
  const cos = (upper * upper + reach * reach - lower * lower) / (2 * upper * reach);
  const angle = Math.acos(Math.min(1, Math.max(-1, cos)));
  limb.joint.copy(root).addScaledVector(dir, upper * Math.cos(angle)).addScaledVector(limb.bend, upper * Math.sin(angle));
  limb.end.copy(root).addScaledVector(dir, reach);
  limb.stretch = want / (upper + lower);
  return limb;
}

const basis = new THREE.Matrix4();
const ax = new THREE.Vector3();
const ay = new THREE.Vector3();
const az = new THREE.Vector3();
const hang = new THREE.Vector3();

/**
 * Bone placement. Every bone's axes follow one rule so parts are easy to
 * model: +y runs up the bone (a limb hangs down -y from its joint), +x is
 * its front, +z its right side.
 */
export function placeUpright(bone: THREE.Object3D, origin: THREE.Vector3, front: THREE.Vector3, up: THREE.Vector3): void {
  ay.copy(up).normalize();
  flatten(front, ay, ax);
  az.crossVectors(ax, ay);
  basis.makeBasis(ax, ay, az);
  bone.position.copy(origin);
  bone.quaternion.setFromRotationMatrix(basis);
}

/** A limb bone at its joint, hanging toward `end`, its front toward `front`. */
export function placeLimb(bone: THREE.Object3D, joint: THREE.Vector3, end: THREE.Vector3, front: THREE.Vector3, stretch = 1): void {
  placeUpright(bone, joint, front, hang.copy(joint).sub(end));
  bone.scale.set(1, stretch, 1);
}

/** A bone whose length runs along +x (the sword and the hands round its grip), `up` across it. */
export function placeAlong(bone: THREE.Object3D, origin: THREE.Vector3, along: THREE.Vector3, up: THREE.Vector3): void {
  ax.copy(along).normalize();
  flatten(up, ax, ay);
  az.crossVectors(ax, ay);
  basis.makeBasis(ax, ay, az);
  bone.position.copy(origin);
  bone.quaternion.setFromRotationMatrix(basis);
}
