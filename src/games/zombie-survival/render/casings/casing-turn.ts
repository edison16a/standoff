import * as THREE from "three";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const a = new THREE.Quaternion();
const b = new THREE.Quaternion();

/**
 * How a case is turned in its own frame, whose long axis is y. In the air
 * it tumbles end over end: `angle` turns it about an axis across its
 * middle, the plane of the tumble faces `heading` and leans by `tilt`.
 * On the ground it lies on its side across the way it rolls (`lie`) and
 * `angle` turns it about its own length, so it rolls rather than skids.
 * The physics lands a case with its angle a quarter turn off upright,
 * which is lying flat, so the two poses meet at the bounce.
 */
export function casingTurn(grounded: boolean, heading: number, angle: number, tilt: number, lie: number, out: THREE.Quaternion): THREE.Quaternion {
  if (grounded) {
    out.setFromAxisAngle(Y, lie);
    out.multiply(a.setFromAxisAngle(X, Math.PI / 2));
    return out.multiply(b.setFromAxisAngle(Y, angle));
  }
  out.setFromAxisAngle(Y, heading);
  out.multiply(a.setFromAxisAngle(Z, tilt));
  return out.multiply(b.setFromAxisAngle(X, angle));
}
