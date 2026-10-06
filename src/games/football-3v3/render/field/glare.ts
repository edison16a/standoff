import * as THREE from "three";
import type { Bank } from "./light-rig";

const VERTEX = /* glsl */ `
attribute vec3 aCentre;
attribute vec3 aAim;
attribute float aSize;
uniform float uLevel;
varying vec2 vUv;
varying float vStrength;
void main() {
  vUv = position.xy;
  // Glare is strongest when the bank shines straight down the lens, as a real flood does.
  vec3 toEye = normalize(cameraPosition - aCentre);
  float facing = max(dot(toEye, aAim), 0.0);
  vStrength = uLevel * (0.25 + 0.75 * pow(facing, 3.0));
  vec4 mv = viewMatrix * vec4(aCentre, 1.0);
  // Billboarded in view space, wider than tall, at a size that holds up far away.
  float size = aSize * (0.7 + 0.6 * facing);
  mv.xy += position.xy * vec2(size * 1.6, size);
  // Pulled a little toward the lens so the lamp housings never cut into it; the roof still hides it.
  mv.z += 3.0;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying float vStrength;
void main() {
  vec2 p = vUv;
  float r = length(p * vec2(1.0, 1.6));
  float halo = exp(-r * r * 9.0) * 0.9 + exp(-r * 3.5) * 0.18;
  // A soft horizontal streak, the way the lamp rows smear across a broadcast lens.
  float streak = exp(-abs(p.y) * 60.0) * exp(-abs(p.x) * 2.2) * 0.45;
  float a = (halo + streak) * vStrength * smoothstep(1.0, 0.6, max(abs(p.x), abs(p.y)));
  gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * a * 2.2, 1.0);
}
`;

/**
 * The glow round each floodlight bank: one instanced quad per bank,
 * turned to the camera and added on top, brighter when the bank faces
 * the lens. Its bright core feeds the bloom; the halo and the streak are
 * what makes the lights read as dazzling from the stands' side.
 */
export class Glare {
  readonly mesh: THREE.Mesh;
  private readonly uniforms = { uLevel: { value: 1 } };

  constructor(all: Bank[]) {
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const centres: number[] = [];
    const aims: number[] = [];
    const sizes: number[] = [];
    for (const bank of all) {
      centres.push(bank.centre.x, bank.centre.y, bank.centre.z);
      const aim = bank.aim.clone().sub(bank.centre).normalize();
      aims.push(aim.x, aim.y, aim.z);
      sizes.push(bank.cols * 0.75);
    }
    geo.setAttribute("aCentre", new THREE.InstancedBufferAttribute(new Float32Array(centres), 3));
    geo.setAttribute("aAim", new THREE.InstancedBufferAttribute(new Float32Array(aims), 3));
    geo.setAttribute("aSize", new THREE.InstancedBufferAttribute(new Float32Array(sizes), 1));
    geo.instanceCount = all.length;
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  setLevel(level: number): void {
    this.uniforms.uLevel.value = level;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
