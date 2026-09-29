import * as THREE from "three";
import { hash } from "../../engine/rng";
import { CLOUD_CELLS, cloudTexture, skylineTexture } from "../art/sky-art";

const VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 top;
  uniform vec3 horizon;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 sky = mix(horizon, top, pow(h, 0.55));
    float d = max(0.0, dot(vDir, sunDir));
    // A bright sun and a warm glow round it.
    sky += sunColor * (smoothstep(0.9985, 0.9992, d) * 0.9 + pow(d, 24.0) * 0.22);
    gl_FragColor = vec4(sky, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Where the sun is: high, behind the camera and to the right, so it lights the train fronts coming at the runner. */
export const SUN_DIR = new THREE.Vector3(0.4, 0.75, 0.55).normalize();

const DOME = 300;
const CLOUD_RING = 230;
const CLOUDS = 14;

/**
 * The sunny sky over the yard: a blue dome that pales to the horizon with
 * the sun in it, a ring of fluffy clouds drifting slowly round, and the
 * far city in the haze. It all rides along with the camera.
 */
export class Sky {
  readonly mesh: THREE.Mesh;
  private readonly uniforms = {
    top: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    sunColor: { value: new THREE.Color() },
    sunDir: { value: SUN_DIR.clone() },
  };
  private readonly skyline: THREE.Mesh;
  private readonly clouds: THREE.Mesh;

  constructor() {
    const material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.BackSide, depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(DOME, 24, 12), material);
    this.mesh.renderOrder = -3;
    this.mesh.frustumCulled = false;

    const texture = skylineTexture().clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(3, 1);
    texture.needsUpdate = true;
    const band = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false });
    this.skyline = new THREE.Mesh(new THREE.CylinderGeometry(250, 250, 60, 48, 1, true), band);
    this.skyline.position.y = 20;
    this.skyline.renderOrder = -2;
    this.skyline.frustumCulled = false;
    this.mesh.add(this.skyline);

    const puffs = new THREE.MeshBasicMaterial({ map: cloudTexture(), transparent: true, depthWrite: false, fog: false });
    this.clouds = new THREE.Mesh(cloudRing(), puffs);
    this.clouds.renderOrder = -1;
    this.clouds.frustumCulled = false;
    this.mesh.add(this.clouds);
  }

  set(top: THREE.Color, horizon: THREE.Color, sun: THREE.Color): void {
    this.uniforms.top.value.copy(top);
    this.uniforms.horizon.value.copy(horizon);
    this.uniforms.sunColor.value.copy(sun);
    // The far city and the clouds take a little of the haze, so they sit in the same air.
    (this.skyline.material as THREE.MeshBasicMaterial).color.copy(WHITE).lerp(horizon, 0.2);
    (this.clouds.material as THREE.MeshBasicMaterial).color.copy(WHITE).lerp(horizon, 0.08);
  }

  follow(camera: THREE.Camera, time: number): void {
    this.mesh.position.copy(camera.position);
    // The clouds drift, slowly enough to feel like weather rather than motion.
    this.clouds.rotation.y = time * 0.004;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.skyline.geometry.dispose();
    const band = this.skyline.material as THREE.MeshBasicMaterial;
    band.map?.dispose();
    band.dispose();
    this.clouds.geometry.dispose();
    (this.clouds.material as THREE.Material).dispose();
  }
}

/** Cloud cards round the horizon, each facing the middle, thickest ahead where the runner looks. */
function cloudRing(): THREE.BufferGeometry {
  const cards: THREE.BufferGeometry[] = [];
  for (let i = 0; i < CLOUDS; i++) {
    // Mostly ahead (down -z), a few round the sides and behind for the view after a crash.
    const ahead = i < 9;
    const yaw = ahead ? Math.PI + (i / 8 - 0.5) * 1.9 + (hash(i, 3) - 0.5) * 0.2 : (i / CLOUDS) * Math.PI * 2;
    const pitch = 0.05 + hash(i, 5) * 0.2;
    const width = 50 + hash(i, 7) * 45;
    const card = new THREE.PlaneGeometry(width, width * 0.5);
    const cell = i % CLOUD_CELLS;
    const u0 = (cell % 2) * 0.5;
    const v0 = cell < 2 ? 0.5 : 0;
    const uv = card.attributes.uv as THREE.BufferAttribute;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * 0.5, v0 + uv.getY(k) * 0.5);
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    card.lookAt(dir.clone().negate());
    card.translate(dir.x * CLOUD_RING, dir.y * CLOUD_RING, dir.z * CLOUD_RING);
    cards.push(card);
  }
  const merged = mergeCards(cards);
  for (const card of cards) card.dispose();
  return merged;
}

function mergeCards(cards: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (const card of cards) {
    const base = positions.length / 3;
    positions.push(...(card.attributes.position!.array as Float32Array));
    uvs.push(...(card.attributes.uv!.array as Float32Array));
    for (const i of card.index!.array) index.push(base + i);
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  merged.setIndex(index);
  return merged;
}

const WHITE = new THREE.Color(0xffffff);
