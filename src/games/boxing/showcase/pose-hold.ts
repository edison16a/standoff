import type * as THREE from "three";

/**
 * Remembers where every part of a model is, to put it back later. The
 * icon holds the puncher at full extension while the fight runs on a few
 * frames more for the other boxer's fall, so the landed hook and the
 * knees going show in the same picture, as key art would pose them.
 */
export function holdPose(root: THREE.Object3D): () => void {
  const saved: { part: THREE.Object3D; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }[] = [];
  root.traverse((part) => saved.push({ part, position: part.position.clone(), quaternion: part.quaternion.clone(), scale: part.scale.clone() }));
  return () => {
    for (const { part, position, quaternion, scale } of saved) {
      part.position.copy(position);
      part.quaternion.copy(quaternion);
      part.scale.copy(scale);
    }
    root.updateMatrixWorld(true);
  };
}
