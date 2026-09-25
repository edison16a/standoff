import * as THREE from "three";

/** Panels of light around the room: where they sit, how big, and their colour. */
const PANELS: readonly { at: [number, number, number]; size: [number, number]; color: number }[] = [
  // Signs down both sides of the street, magenta on the left and cyan on the right.
  { at: [-9, 2, -4], size: [3, 6], color: 0xff2bd6 },
  { at: [9, 3, -2], size: [3, 5], color: 0x21f3ff },
  { at: [-9, 5, 6], size: [4, 2], color: 0xffb020 },
  { at: [9, 1, 7], size: [3, 3], color: 0x8a5bff },
  // A soft glow of the city overhead, and a bright strip for a crisp highlight.
  { at: [0, 9, 0], size: [14, 14], color: 0x2a2250 },
  { at: [0, 8.5, -6], size: [10, 0.6], color: 0xffffff },
];

/**
 * The light every glossy surface reflects: a dark street lined with
 * neon, made once from a tiny scene. Wet ground, train paint and the
 * runners' shoes all catch magenta and cyan from it, which is most of
 * what makes the city look lit at night, for the price of one texture.
 */
export function neonEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07061a);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  for (const panel of PANELS) {
    const geometry = new THREE.PlaneGeometry(panel.size[0], panel.size[1]);
    const material = new THREE.MeshBasicMaterial({ color: panel.color, side: THREE.DoubleSide });
    // Colours past white make the reflections bright enough to read as light.
    material.color.multiplyScalar(panel.color === 0xffffff ? 6 : 3);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...panel.at);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    geometries.push(geometry);
    materials.push(material);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  for (const g of geometries) g.dispose();
  for (const m of materials) m.dispose();
  return texture;
}
