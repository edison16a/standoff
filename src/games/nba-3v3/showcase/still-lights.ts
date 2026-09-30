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

/**
 * The icon's lighting, for a player running at the camera along `facing`
 * (a flat unit direction): the warm key comes from high in front of him,
 * a little to one side, to light his face and chest, and two cold spots
 * from behind cut a rim along both shoulders.
 */
export function iconLights(subject: THREE.Vector3, facing: { x: number; z: number }): THREE.Object3D[] {
  const at = (ahead: number, side: number, up: number) =>
    new THREE.Vector3(subject.x + facing.x * ahead - facing.z * side, subject.y + up, subject.z + facing.z * ahead + facing.x * side);
  return [
    ...spot("#ffd6a0", 70, at(5, 2, 4.5), subject, 0.3),
    ...spot("#7fb2ff", 150, at(-5, 3.5, 4.5), subject, 0.4),
    ...spot("#9fc4ff", 110, at(-5, -3.5, 4), subject, 0.4),
  ];
}
