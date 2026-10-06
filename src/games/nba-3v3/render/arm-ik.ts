import * as THREE from "three";

const parentInv = new THREE.Matrix4();
const goal = new THREE.Vector3();
const reachV = new THREE.Vector3();
const elbowAt = new THREE.Vector3();
const poleV = new THREE.Vector3();
const axis = new THREE.Vector3();
const a1 = new THREE.Vector3();
const a2 = new THREE.Vector3();
const q1 = new THREE.Quaternion();
const qs = new THREE.Quaternion();
const rotX = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0);

export interface ArmChain {
  shoulder: THREE.Object3D;
  elbow: THREE.Object3D;
  hand: THREE.Object3D;
}

/**
 * Two bone reach: turns the shoulder and bends the elbow (about its own
 * x, as the poses do) so that `palm`, a point in the hand's frame, lands
 * on `target` in the world, as near as the arm's length allows. The
 * elbow points toward `pole` (in the torso's frame), out and back for a
 * dribble. `weight` blends from the pose's own arm (0) to the reach (1).
 * World matrices must be current; the arm's are updated after.
 */
export function reachArm(arm: ArmChain, target: THREE.Vector3, palm: THREE.Vector3, pole: THREE.Vector3, weight: number): void {
  if (weight <= 0) return;
  const { shoulder, elbow, hand } = arm;
  const parent = shoulder.parent!;
  goal.copy(target).applyMatrix4(parentInv.copy(parent.matrixWorld).invert()).sub(shoulder.position);
  const upper = elbow.position.length();
  // The forearm runs from the elbow to the palm, with the wrist as the pose has it.
  const fore = reachV.copy(palm).applyQuaternion(hand.quaternion).add(hand.position);
  const F = fore.length();
  const d = THREE.MathUtils.clamp(goal.length(), Math.abs(upper - F) + 1e-4, upper + F - 1e-4);
  // Law of cosines for the angle the elbow must close, less the slant the palm already has off the forearm's line.
  const inner = Math.acos(THREE.MathUtils.clamp((upper * upper + F * F - d * d) / (2 * upper * F), -1, 1));
  const slant = Math.atan2(fore.z, -fore.y);
  const flex = Math.max(0, Math.PI - inner - slant);
  // Where the palm sits in the shoulder's frame with that bend, then turn the shoulder to point it at the goal.
  rotX.setFromAxisAngle(X, -flex);
  a1.copy(fore).applyQuaternion(rotX).add(elbow.position).normalize();
  a2.copy(goal).normalize();
  q1.setFromUnitVectors(a1, a2);
  // Swivel about the line to the goal so the elbow points toward the pole.
  elbowAt.copy(elbow.position).applyQuaternion(q1);
  axis.copy(a2);
  const e = elbowAt.sub(a2.clone().multiplyScalar(elbowAt.dot(a2)));
  const p = poleV.copy(pole).sub(axis.clone().multiplyScalar(pole.dot(axis)));
  if (e.lengthSq() > 1e-8 && p.lengthSq() > 1e-8) {
    const angle = Math.atan2(axis.dot(e.clone().cross(p)), e.dot(p));
    qs.setFromAxisAngle(axis, angle);
    q1.premultiply(qs);
  }
  shoulder.quaternion.slerp(q1, weight);
  elbow.rotation.x += (-flex - elbow.rotation.x) * weight;
  shoulder.updateMatrixWorld(true);
}
