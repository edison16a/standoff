import * as THREE from "three";
import { PITCH } from "../../engine/tuning";

/**
 * The floodlights as lights. The key is the nearest bank of lamps on the
 * camera's side, high up, casting the one soft shadow every player and
 * the ball throws. The banks across the ground light the backs and rim
 * the shoulders without shadows, and a sky and ground light gives the
 * cool fill from above and the green bounce off the turf from below.
 */
export function stadiumLights(shadows: boolean): { group: THREE.Group; key: THREE.DirectionalLight; ambient: THREE.HemisphereLight } {
  const group = new THREE.Group();
  const key = new THREE.DirectionalLight("#fff1dc", 2.7);
  key.position.set(-22, 34, 26);
  key.castShadow = shadows;
  key.shadow.mapSize.set(2048, 2048);
  // A wide filter: floodlights are big lamps far away, so shadows soften with distance from the feet.
  key.shadow.radius = 3.5;
  key.shadow.blurSamples = 12;
  const cam = key.shadow.camera;
  // The pitch, its boards and the goals' nets, and no more, so every texel counts.
  cam.left = -(PITCH.halfLength + 4);
  cam.right = PITCH.halfLength + 4;
  cam.top = PITCH.halfWidth + 6;
  cam.bottom = -(PITCH.halfWidth + 6);
  cam.near = 10;
  cam.far = 90;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.025;
  const across = new THREE.DirectionalLight("#e6edff", 1.1);
  across.position.set(24, 30, -22);
  const side = new THREE.DirectionalLight("#fff0da", 0.65);
  side.position.set(26, 26, 20);
  const back = new THREE.DirectionalLight("#dfe7ff", 0.45);
  back.position.set(-24, 26, -22);
  const ambient = new THREE.HemisphereLight("#93a8dc", "#2d5a28", 0.38);
  group.add(key, key.target, across, side, back, ambient);
  return { group, key, ambient };
}
