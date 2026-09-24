import * as THREE from "three";

export interface Spot {
  x: number;
  y: number;
  z: number;
  rotY?: number;
  scale?: number;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);

/**
 * Draws one model at many spots in a single draw call. The scenery is
 * almost all built this way, which is what keeps four split screen views
 * of a busy beach at a steady frame rate.
 */
export function instances(geometry: THREE.BufferGeometry, material: THREE.Material, spots: readonly Spot[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, spots.length));
  mesh.count = spots.length;
  spots.forEach((spot, i) => {
    const s = spot.scale ?? 1;
    q.setFromAxisAngle(up, spot.rotY ?? 0);
    m.compose(new THREE.Vector3(spot.x, spot.y, spot.z), q, new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** The one material every vertex coloured prop shares. */
export function propMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ vertexColors: true });
}
