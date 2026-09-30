import * as THREE from "three";

const DOWN = new THREE.Vector3(0, -1, 0);
const s = new THREE.Vector3();
const t = new THREE.Vector3();
const e = new THREE.Vector3();
const q = new THREE.Quaternion();

/**
 * Bends a two bone limb so its end lands on `target`, in world space.
 * The rig's limbs hang down -y from each joint: `upper` holds `lower` at
 * (0, -a, 0), which holds the end at (0, -b, 0). `pole` is a world
 * direction the middle joint bows toward, like an elbow out to the side.
 * Too far a reach straightens the limb and points it at the target.
 */
export function reach(upper: THREE.Object3D, lower: THREE.Object3D, a: number, b: number, target: THREE.Vector3, pole: THREE.Vector3): void {
  upper.updateWorldMatrix(true, false);
  upper.getWorldPosition(s);
  t.copy(target).sub(s);
  const dist = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, t.length()));
  const dir = t.normalize();
  // How far along the reach the middle joint sits, and how far it bows out of line.
  const along = (a * a - b * b + dist * dist) / (2 * dist);
  const out = Math.sqrt(Math.max(0, a * a - along * along));
  const bow = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (bow.lengthSq() < 1e-8) bow.set(0, -1, 0).addScaledVector(dir, dir.y);
  bow.normalize();
  e.copy(s).addScaledVector(dir, along).addScaledVector(bow, out);
  const end = s.clone().addScaledVector(dir, dist);

  aimDown(upper, e.clone().sub(s));
  lower.updateWorldMatrix(true, false);
  aimDown(lower, end.sub(e));
}

/** Turns a joint so its hanging axis points along `worldDir`. */
function aimDown(joint: THREE.Object3D, worldDir: THREE.Vector3): void {
  const parent = joint.parent;
  if (parent) {
    parent.getWorldQuaternion(q);
    worldDir.applyQuaternion(q.invert());
  }
  joint.quaternion.setFromUnitVectors(DOWN, worldDir.normalize());
  joint.updateWorldMatrix(false, false);
}
