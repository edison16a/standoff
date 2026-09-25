import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * What shiny things reflect. By day, a bright studio room. In the evening
 * a dark hall with a few hard lights overhead: steel catches sharp
 * highlights while cloth and the crowd stay in the dark, which a bright
 * studio would light up from every side.
 */
export function hallEnvironment(renderer: THREE.WebGLRenderer, dark: boolean): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const scene = dark ? eveningHall() : new RoomEnvironment();
  const texture = pmrem.fromScene(scene, 0.04).texture;
  pmrem.dispose();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
  });
  return texture;
}

function eveningHall(): THREE.Scene {
  const scene = new THREE.Scene();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(30, 14, 30), new THREE.MeshBasicMaterial({ color: 0x0b0d16, side: THREE.BackSide }));
  shell.position.y = 5;
  scene.add(shell);
  const lamp = (color: number, strength: number, size: [number, number, number], at: [number, number, number]) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength) });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...at);
    scene.add(mesh);
  };
  // The rig of spotlights overhead, hard and bright.
  for (const x of [-6, -2, 2, 6]) lamp(0xfff1dc, 26, [0.8, 0.2, 0.8], [x, 10, 0.5]);
  // The ribbon boards and scoring lamps glow low down, warm on one side, cool on the other.
  lamp(0x6a5cff, 4, [24, 0.8, 0.2], [0, 1, -9]);
  lamp(0xff4757, 6, [1, 1, 1], [-7, 2, -3]);
  lamp(0x2ed573, 6, [1, 1, 1], [7, 2, -3]);
  // A faint wash of fill from the front, where the cameras are, and the lit floor below.
  lamp(0x9fb4ff, 1.4, [20, 6, 0.2], [0, 4, 14]);
  lamp(0x5a6c9a, 1.1, [14, 0.1, 6], [0, -1.5, 0]);
  lamp(0xffe2c0, 3, [0.2, 4, 8], [-12, 5, 0]);
  lamp(0xc6d6ff, 2.5, [0.2, 4, 8], [12, 5, 0]);
  return scene;
}
