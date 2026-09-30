import * as THREE from "three";

/** A hard spot on one point: a narrow cone with a soft edge, and its target so it can be aimed. */
function spot(color: string, intensity: number, from: THREE.Vector3, at: THREE.Vector3, angle: number): THREE.Object3D[] {
  const light = new THREE.SpotLight(color, intensity, 0, angle, 0.55, 1.2);
  light.position.copy(from);
  light.target.position.copy(at);
  return [light, light.target];
}

/**
 * The stills' lighting, like key art: a warm floodlight spot from high
 * on one side picks the players out of a darker ground, and a cold spot
 * from behind cuts a hard rim along their shoulders and legs.
 */
export function stillLights(subject: THREE.Vector3): THREE.Object3D[] {
  return [
    ...spot("#ffdcae", 90, new THREE.Vector3(subject.x - 6, 7, subject.z - 3), subject, 0.3),
    ...spot("#86b6ff", 170, new THREE.Vector3(subject.x + 3, 6.5, subject.z + 5), subject, 0.4),
  ];
}

/**
 * The icon's lighting, for a hero running along `facing` (a flat unit
 * direction) past the camera: a warm key high in front of him lights his
 * face and chest, and two cold spots from behind cut a rim along his
 * shoulders and legs.
 */
export function iconLights(subject: THREE.Vector3, facing: { x: number; z: number }): THREE.Object3D[] {
  const at = (ahead: number, side: number, up: number) =>
    new THREE.Vector3(subject.x + facing.x * ahead - facing.z * side, subject.y + up, subject.z + facing.z * ahead + facing.x * side);
  return [
    ...spot("#ffdcae", 55, at(5, 3, 5), subject, 0.32),
    ...spot("#86b6ff", 120, at(-5, 3.5, 5), subject, 0.4),
    ...spot("#9fc4ff", 80, at(-4.5, -3.5, 4.5), subject, 0.4),
  ];
}
