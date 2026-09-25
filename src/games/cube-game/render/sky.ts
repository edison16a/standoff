import * as THREE from "three";
import type { Theme } from "./themes";

const DISTANCE = 160;

/**
 * The sky: a gradient from the horizon's glow up into the dark, a big
 * sun cut by stripes like a synthwave sunset, and a scatter of stars. It
 * rides along far behind the camera, drifting a little for depth.
 */
export class Sky {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(theme: Theme) {
    this.material = new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {
        low: { value: new THREE.Color(theme.skyLow) },
        high: { value: new THREE.Color(theme.skyHigh) },
        sun: { value: new THREE.Color(theme.sun) },
        sunSize: { value: theme.sunSize * 2.2 },
        sunAt: { value: new THREE.Vector2(0, 26) },
        pulse: { value: 0 },
        time: { value: 0 },
        horizon: { value: -4 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vPlace;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vPlace = world.xy;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 low;
        uniform vec3 high;
        uniform vec3 sun;
        uniform float sunSize;
        uniform vec2 sunAt;
        uniform float pulse;
        uniform float time;
        uniform float horizon;
        varying vec2 vPlace;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        void main() {
          float h = clamp((vPlace.y - horizon) / 45.0, 0.0, 1.0);
          vec3 colour = mix(low * 1.15, high, pow(h, 0.55));
          vec2 d = vPlace - sunAt;
          float r = length(d) / sunSize;
          // The sun is cut by stripes that thicken toward its foot.
          float stripes = step(0.0, sin((vPlace.y - sunAt.y) * 1.4 + time * 0.8)) + step(0.25, (vPlace.y - sunAt.y) / sunSize + 0.2);
          float disc = (1.0 - smoothstep(0.98, 1.0, r)) * clamp(stripes, 0.0, 1.0);
          vec3 sunColour = mix(sun * 0.95, sun * vec3(0.9, 0.45, 0.75), clamp(-d.y / sunSize * 0.5 + 0.5, 0.0, 1.0));
          colour = mix(colour, sunColour, disc);
          colour += sun * exp(-max(r - 1.0, 0.0) * 2.6) * (0.18 + pulse * 0.12) * (1.0 - disc);
          vec2 cell = floor(vPlace * 0.35);
          vec2 spot = fract(vPlace * 0.35) - 0.25 - 0.5 * vec2(hash(cell + 1.7), hash(cell + 5.3));
          float twinkle = 0.6 + 0.4 * sin(time * 2.0 + hash(cell + 3.0) * 20.0);
          float star = step(0.9, hash(cell)) * smoothstep(0.08, 0.0, length(spot)) * smoothstep(0.3, 0.8, h) * twinkle;
          colour += vec3(star) * 0.9;
          gl_FragColor = vec4(colour, 1.0);
        }
      `,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(900, 260), this.material);
    this.mesh.position.set(0, 60, -DISTANCE);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  /** Sets where the floor meets the sky, as seen from the current camera, in world height at the sky's distance. */
  setHorizon(y: number): void {
    this.material.uniforms.horizon!.value = y;
  }

  update(cameraX: number, time: number, pulse: number): void {
    // Almost locked to the camera, so the sun barely moves, like something very far away.
    this.mesh.position.x = cameraX;
    this.material.uniforms.sunAt!.value.set(cameraX + 16 - cameraX * 0.02, this.material.uniforms.horizon!.value + 4);
    this.material.uniforms.pulse!.value = pulse;
    this.material.uniforms.time!.value = time;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
