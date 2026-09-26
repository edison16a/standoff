import * as THREE from "three";
import { ball, cone, cyl, merge, paint } from "../geo";
import { LIGHT } from "../palette";

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSun;
uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
  float s = max(dot(normalize(vDir), uSunDir), 0.0);
  col += uSun * (pow(s, 380.0) * 2.4 + pow(s, 12.0) * 0.28);
  // Soft bands of cloud low on the sky.
  float band = sin(vDir.x * 9.0 + vDir.z * 5.0) * 0.5 + 0.5;
  col = mix(col, vec3(1.0), smoothstep(0.55, 1.0, band) * smoothstep(0.32, 0.08, h) * smoothstep(0.0, 0.05, h) * 0.35);
  gl_FragColor = vec4(col, 1.0);
}`;

/** The way the sun shines from: low in the west, so fighters cast long shadows across the field. */
export const SUN_DIR = new THREE.Vector3(-0.55, 0.62, 0.35).normalize();

/**
 * Everything past the nets: the sky, the grass the field sits in, rolling
 * hills and a ring of trees. None of it is ever close to a camera, so it
 * is kept simple and merged.
 */
export function buildScenery(): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group();
  const owned: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, receive = false) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = receive;
    group.add(mesh);
    owned.push({ geometry, material });
    return mesh;
  };

  const sky = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color("#3f8fe0") },
      uHorizon: { value: new THREE.Color(LIGHT.fog) },
      uSun: { value: new THREE.Color("#fff1d0") },
      uSunDir: { value: SUN_DIR },
    },
  });
  const dome = add(new THREE.SphereGeometry(420, 32, 16), sky);
  dome.renderOrder = -1;

  // Grass round the field, out to the hills.
  const grass = new THREE.MeshStandardMaterial({ color: "#4f8a2e", roughness: 1 });
  const ground = add(new THREE.CircleGeometry(400, 48), grass, true);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;

  // Low hills in a ring, far off.
  const hills: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const d = 230 + (i % 3) * 40;
    const r = 60 + ((i * 37) % 50);
    hills.push(paint(ball(r, 16, 8), i % 2 ? "#4a7a3a" : "#5b8c45", { at: [Math.sin(a) * d, -r * 0.62, Math.cos(a) * d], scale: [1.6, 1, 1] }));
  }
  add(merge(hills), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));

  // Trees round the grounds: a trunk and two cones of leaves each.
  const trees: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 + (i % 5) * 0.03;
    const d = 62 + ((i * 29) % 30);
    const x = Math.sin(a) * d * 0.85;
    const z = Math.cos(a) * d;
    const s = 0.8 + ((i * 13) % 10) / 12;
    const leaf = i % 3 ? "#2f6b34" : "#3d7d3a";
    trees.push(paint(cyl(0.18 * s, 0.25 * s, 2.4 * s, 6), "#5a4030", { at: [x, 1.2 * s, z] }));
    trees.push(paint(cone(2.2 * s, 4.2 * s, 8), leaf, { at: [x, 4 * s, z] }));
    trees.push(paint(cone(1.6 * s, 3.2 * s, 8), leaf, { at: [x, 5.9 * s, z] }));
  }
  add(merge(trees), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));

  return {
    group,
    dispose() {
      for (const { geometry, material } of owned) {
        geometry.dispose();
        material.dispose();
      }
    },
  };
}
