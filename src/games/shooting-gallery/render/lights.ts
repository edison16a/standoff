import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Warm fairground light. One key light from high in front casts the soft
 * shadows of ducks and targets onto the wall, like the cover. A warm
 * glow near the bulbs lifts the top of the wall, so nothing up there
 * ever sits in a dark band. A small room environment gives the metal of
 * the guns and the golden duck something to reflect.
 */
export function addLights(scene: THREE.Scene, renderer: THREE.WebGLRenderer): () => void {
  scene.add(new THREE.HemisphereLight("#fff1dc", "#3b2418", 0.45));

  const key = new THREE.DirectionalLight("#fff0d8", 1.7);
  key.position.set(1.2, 6.5, 6.5);
  key.target.position.set(0, 1.4, -2.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  const box = key.shadow.camera;
  box.left = -6;
  box.right = 6;
  box.top = 5;
  box.bottom = -3;
  box.near = 1;
  box.far = 20;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);

  const bulbs = new THREE.PointLight("#ffc27a", 5, 9, 1.6);
  bulbs.position.set(0, 3.8, -2.3);
  scene.add(bulbs);

  // A cool fill from the side keeps the far side of each duck from going flat.
  const fill = new THREE.DirectionalLight("#c9dcff", 0.35);
  fill.position.set(-5, 2, 5);
  scene.add(fill);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.3;
  room.dispose();
  pmrem.dispose();
  return () => environment.dispose();
}
