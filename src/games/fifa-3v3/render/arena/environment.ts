import * as THREE from "three";

/**
 * What shiny things reflect: the stadium at night as seen from the
 * pitch. A dark sky, the lit bowl of the stands round the horizon, a
 * ring of blazing floodlight banks high up and the green of the turf
 * below. It is drawn once into a prefiltered map, so it costs nothing a
 * frame, and it is what makes the ball, the posts and the boots catch
 * the lights.
 */
export function stadiumEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const add = (geometry: THREE.BufferGeometry, colour: string, strength: number, at?: THREE.Vector3, look?: THREE.Vector3) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(strength), side: THREE.BackSide });
    const mesh = new THREE.Mesh(geometry, material);
    if (at) mesh.position.copy(at);
    if (look) mesh.lookAt(look);
    geometries.push(geometry);
    materials.push(material);
    scene.add(mesh);
    return mesh;
  };
  add(new THREE.SphereGeometry(50, 32, 16), "#0b1226", 1);
  // The stands: a band round the horizon, lit by the floodlights.
  add(new THREE.CylinderGeometry(40, 40, 16, 48, 1, true), "#3a3f52", 1, new THREE.Vector3(0, 6, 0));
  // The turf.
  const ground = add(new THREE.CircleGeometry(40, 32), "#2f6e2c", 0.9, new THREE.Vector3(0, -2, 0));
  ground.rotation.x = Math.PI / 2;
  ground.material.side = THREE.DoubleSide;
  // Four floodlight banks at the corners, and the roof's strip lights between them.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const at = new THREE.Vector3(Math.cos(a) * 34, 26, Math.sin(a) * 34);
    const bank = add(new THREE.PlaneGeometry(9, 5), "#fff4e0", 28, at, new THREE.Vector3(0, 0, 0));
    bank.material.side = THREE.DoubleSide;
  }
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const strip = add(new THREE.PlaneGeometry(8, 0.6), "#fff0d8", 6, new THREE.Vector3(Math.cos(a) * 38, 17, Math.sin(a) * 38), new THREE.Vector3(0, 10, 0));
    strip.material.side = THREE.DoubleSide;
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  for (const g of geometries) g.dispose();
  for (const m of materials) m.dispose();
  return texture;
}
