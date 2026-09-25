import * as THREE from "three";
import { skylineTexture } from "../art/night-art";

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
  uniform vec3 moonColor;
  uniform vec3 moonDir;
  uniform vec3 glow;
  varying vec3 vDir;
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 sky = mix(horizon, top, pow(h, 0.45));
    // The city's neon lights the haze from below, strongest just over the rooftops.
    sky += glow * 0.35 * exp(-h * 9.0);
    // Stars, only high up where the city glow has faded.
    vec3 cell = floor(vDir * 180.0);
    float star = step(0.997, hash(cell)) * smoothstep(0.15, 0.5, h);
    sky += vec3(star * 0.9);
    float d = max(0.0, dot(vDir, moonDir));
    sky += moonColor * (smoothstep(0.9993, 0.9996, d) * 1.2 + pow(d, 60.0) * 0.25);
    gl_FragColor = vec4(sky, 1.0);
  }
`;

/**
 * The night over the neon city: a gradient dome with stars, a moon and
 * the glow of the signs over the rooftops, and a ring of far towers with
 * lit windows round the horizon. It all rides along with the camera.
 */
export class Sky {
  readonly mesh: THREE.Mesh;
  private readonly uniforms = {
    top: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    moonColor: { value: new THREE.Color() },
    moonDir: { value: new THREE.Vector3(-0.35, 0.42, -1).normalize() },
    glow: { value: new THREE.Color() },
  };
  private readonly skyline: THREE.Mesh;

  constructor() {
    const material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.BackSide, depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), material);
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false;
    const texture = skylineTexture().clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(3, 1);
    texture.needsUpdate = true;
    const band = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false });
    this.skyline = new THREE.Mesh(new THREE.CylinderGeometry(250, 250, 80, 48, 1, true), band);
    this.skyline.position.y = 28;
    this.skyline.renderOrder = -1;
    this.skyline.frustumCulled = false;
    this.mesh.add(this.skyline);
  }

  set(top: THREE.Color, horizon: THREE.Color, moon: THREE.Color, glow: THREE.Color): void {
    this.uniforms.top.value.copy(top);
    this.uniforms.horizon.value.copy(horizon);
    this.uniforms.moonColor.value.copy(moon);
    this.uniforms.glow.value.copy(glow);
    // The far towers sink into the haze at the horizon's colour.
    (this.skyline.material as THREE.MeshBasicMaterial).color.copy(horizon).lerp(WHITE, 0.55);
  }

  follow(camera: THREE.Camera): void {
    this.mesh.position.copy(camera.position);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.skyline.geometry.dispose();
    const band = this.skyline.material as THREE.MeshBasicMaterial;
    band.map?.dispose();
    band.dispose();
  }
}

const WHITE = new THREE.Color(0xffffff);
