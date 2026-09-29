import * as THREE from "three";

/** Softboxes round a dark stage: where each hangs, how big, and how bright. */
const PANELS: readonly { at: [number, number, number]; size: [number, number]; power: number; tint: string }[] = [
  { at: [0, 10, 0], size: [5, 5], power: 1.6, tint: "#fff3dc" },
  { at: [-9, 3, 5], size: [2.5, 7], power: 7, tint: "#ffffff" },
  { at: [9, 3, 4], size: [2.5, 7], power: 6, tint: "#dfe9ff" },
  { at: [0, 4, -10], size: [9, 1.5], power: 4, tint: "#ffd9a0" },
  { at: [5, 2, 9], size: [2, 2.5], power: 4, tint: "#ffffff" },
  // Lamps hung round the rig overhead, which flat plates facing up at an angle reflect.
  { at: [0, 9, 11], size: [7, 2.5], power: 2.4, tint: "#ffe6c0" },
  { at: [9, 9, -6], size: [6, 2.5], power: 2, tint: "#ffe6c0" },
  { at: [-9, 9, -6], size: [6, 2.5], power: 2, tint: "#ffe6c0" },
];
/** A ring of small warm lamps low round the walls, as a lit arena, so edges of metal sparkle. */
const LAMPS = 28;

/**
 * A dark stage with a few bright softboxes, baked into an environment
 * map. Polished gold picks up crisp highlights from the panels, while
 * matte things like the floor stay dark, which a bright room map would
 * wash out to grey. Set it as `scene.environment` and dispose it after.
 */
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: "#2a1f16", side: THREE.BackSide }));
  scene.add(room);
  const plane = new THREE.PlaneGeometry(1, 1);
  const materials: THREE.Material[] = [room.material];
  for (const panel of PANELS) {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(panel.tint).multiplyScalar(panel.power), side: THREE.DoubleSide });
    materials.push(material);
    const mesh = new THREE.Mesh(plane, material);
    mesh.position.set(...panel.at);
    mesh.scale.set(panel.size[0], panel.size[1], 1);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  }
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffc98a").multiplyScalar(5) });
  materials.push(lamp);
  for (let i = 0; i < LAMPS; i++) {
    const a = (i / LAMPS) * Math.PI * 2;
    const mesh = new THREE.Mesh(plane, lamp);
    mesh.position.set(Math.cos(a) * 14, 1 + (i % 3) * 1.6, Math.sin(a) * 14);
    mesh.scale.set(2.2, 1.2, 1);
    mesh.lookAt(0, 1, 0);
    scene.add(mesh);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  room.geometry.dispose();
  plane.dispose();
  for (const material of materials) material.dispose();
  return texture;
}
