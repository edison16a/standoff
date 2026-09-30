import * as THREE from "three";

/** A hard spot on one point: a narrow cone with a soft edge, and its target so it can be aimed. */
function spot(color: string, intensity: number, from: THREE.Vector3, at: THREE.Vector3, angle: number): THREE.Object3D[] {
  const light = new THREE.SpotLight(color, intensity, 0, angle, 0.55, 1.2);
  light.position.copy(from);
  light.target.position.copy(at);
  return [light, light.target];
}

/**
 * The stills' lighting, like a sports poster: a warm key spot low from
 * the side picks the dunker out of the dark, and a cold spot from behind
 * the glass cuts a hard rim along his arms and the defender's shoulders.
 */
export function stillLights(subject: THREE.Vector3): THREE.Object3D[] {
  return [
    ...spot("#ffd8a8", 45, new THREE.Vector3(subject.x - 6.5, 6, subject.z + 2.5), subject, 0.3),
    ...spot("#7fb2ff", 110, new THREE.Vector3(subject.x + 2.5, 6.5, subject.z - 4.5), subject, 0.42),
  ];
}
