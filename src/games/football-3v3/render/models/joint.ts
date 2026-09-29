import * as THREE from "three";

/** Adds a mesh to a joint and remembers its geometry for disposal. */
export type Mesher = (parent: THREE.Object3D, geo: THREE.BufferGeometry, material?: THREE.Material) => THREE.Mesh;

/** A bare pivot at a spot on its parent. The animations turn these. */
export const joint = (parent: THREE.Object3D, x: number, y: number, z = 0) => {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
};
