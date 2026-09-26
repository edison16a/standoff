import * as THREE from "three";

/** One flame: where its base is, how tall, and its own flicker. */
export interface FlameSpot {
  at: THREE.Vector3;
  size: number;
}

/** Each instance carries its base and size in `flame`; its flicker is seeded by its index. */
const VERTEX = /* glsl */ `
  attribute vec4 flame;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    vUv = uv;
    vSeed = float(gl_InstanceID) * 0.37;
    // Turned about the vertical to face whichever view is drawing, so a flame never shows its edge.
    vec3 toCamera = cameraPosition - flame.xyz;
    vec3 side = normalize(vec3(toCamera.z, 0.0, -toCamera.x));
    vec3 world = flame.xyz + (side * position.x * 0.55 + vec3(0.0, position.y, 0.0)) * flame.w;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uStrength;
  varying vec2 vUv;
  varying float vSeed;
  float wave(float x, float s) { return sin(x * 7.0 + uTime * 0.011 * s + vSeed * 13.0) * 0.5 + 0.5; }
  void main() {
    vec2 p = vUv - vec2(0.5, 0.0);
    float h = vUv.y;
    // A teardrop that narrows toward the top, its edge licking from side to side.
    float lick = (wave(h, 1.0) - 0.5) * 0.18 * h + (wave(h * 2.3, 1.7) - 0.5) * 0.08 * h;
    float width = 0.42 * (1.0 - h) * (0.6 + 0.4 * sqrt(max(0.0, 1.0 - h)));
    float d = abs(p.x - lick) / max(0.001, width);
    float body = smoothstep(1.0, 0.2, d) * smoothstep(0.0, 0.08, h);
    float flicker = 0.85 + 0.15 * wave(0.3, 2.9);
    vec3 hot = mix(vec3(1.0, 0.95, 0.7), vec3(1.0, 0.45, 0.08), smoothstep(0.1, 0.8, h + d * 0.3));
    vec3 colour = hot * body * flicker * uStrength;
    gl_FragColor = vec4(colour * (1.0 - smoothstep(0.7, 1.0, h)), 1.0);
  }
`;

/**
 * Every fire in the arena: torches on the walls and the big braziers on
 * the dais. Each is a flat flame that always faces the camera, drawn in
 * one instanced call, its shape licking and flickering in the shader.
 */
export class Flames {
  readonly mesh: THREE.InstancedMesh;
  private readonly uniforms = { uTime: { value: 0 }, uStrength: { value: 1 } };

  constructor(spots: readonly FlameSpot[], strength: number) {
    const geometry = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    const flame = new THREE.InstancedBufferAttribute(new Float32Array(spots.length * 4), 4);
    spots.forEach((spot, i) => flame.setXYZW(i, spot.at.x, spot.at.y, spot.at.z, spot.size));
    geometry.setAttribute("flame", flame);
    this.uniforms.uStrength.value = strength;
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, spots.length);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  update(t: number): void {
    this.uniforms.uTime.value = t;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
