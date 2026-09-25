import * as THREE from "three";
import { Rng } from "../../engine/rng";
import { painted } from "../textures";

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
    float sun = pow(max(0.0, dot(vDir, sunDir)), 180.0);
    float haze = pow(max(0.0, dot(vDir, sunDir)), 6.0) * 0.35;
    gl_FragColor = vec4(sky + sunColor * (sun * 1.4 + haze), 1.0);
  }
`;

/** A gradient sky with a sun, a dome that rides along with the camera. */
export class Sky {
  readonly mesh: THREE.Mesh;
  private readonly uniforms = {
    top: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    sunColor: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0.35, 0.35, -1).normalize() },
  };

  constructor() {
    const material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.BackSide, depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), material);
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false;
    this.clouds = new THREE.SpriteMaterial({ map: cloudTexture(), fog: false, depthWrite: false, transparent: true });
    // Puffy clouds low over the horizon ahead, riding along with the dome.
    const rng = new Rng(3);
    for (let i = 0; i < 9; i++) {
      const cloud = new THREE.Sprite(this.clouds);
      const a = -Math.PI / 2 + rng.range(-1.1, 1.1);
      const r = rng.range(200, 260);
      cloud.position.set(Math.cos(a) * r, rng.range(40, 95), Math.sin(a) * r);
      const size = rng.range(55, 95);
      cloud.scale.set(size * 2, size, 1);
      cloud.renderOrder = -1;
      this.mesh.add(cloud);
    }
  }

  private readonly clouds: THREE.SpriteMaterial;

  /** Clouds take a tint of the sky, pink at sunset and violet at night. */
  tintClouds(color: THREE.Color): void {
    this.clouds.color.copy(color);
  }

  set(top: THREE.Color, horizon: THREE.Color, sun: THREE.Color): void {
    this.uniforms.top.value.copy(top);
    this.uniforms.horizon.value.copy(horizon);
    this.uniforms.sunColor.value.copy(sun);
  }

  follow(camera: THREE.Camera): void {
    this.mesh.position.copy(camera.position);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.clouds.dispose();
  }
}

/** A cartoon cloud: overlapping puffs, lit from above with a soft grey belly. */
function cloudTexture(): THREE.Texture {
  return painted("cloud", 256, 128, (ctx, w, h) => {
    const puffs: [number, number, number][] = [[0.25, 0.62, 0.22], [0.42, 0.45, 0.28], [0.62, 0.5, 0.25], [0.78, 0.64, 0.18], [0.5, 0.68, 0.24]];
    for (const [pass, fill] of [[0, "#c9d3e6"], [1, "#ffffff"]] as const) {
      ctx.fillStyle = fill;
      for (const [x, y, r] of puffs) {
        ctx.beginPath();
        ctx.arc(x * w, (y - pass * 0.05) * h, r * h * (1 - pass * 0.08), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}
