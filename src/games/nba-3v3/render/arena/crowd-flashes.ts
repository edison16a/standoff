import * as THREE from "three";
import type { Seat } from "./seat-layout";

/** One fan in this many holds up a phone. */
const EVERY = 9;

const VERTEX = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uExcite;
  uniform float uScale;
  varying float vFlash;
  void main() {
    // A camera flash: a few frames of light at a random moment, more often when the crowd is up.
    float rate = 0.35 + uExcite * 1.6;
    float t = fract(uTime * rate * (0.6 + fract(aPhase * 3.1) * 0.8) + aPhase);
    vFlash = smoothstep(0.985, 0.995, t) * (1.0 - smoothstep(0.995, 1.0, t));
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = vFlash > 0.0 ? uScale * 0.22 / -view.z : 0.0;
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vFlash;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float glow = exp(-r * r * 5.0);
    // Far brighter than white, so the finish blooms it into a small star.
    gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * glow * vFlash * 9.0, 1.0);
  }
`;

/**
 * Camera and phone flashes popping round the bowl, the sparkle a
 * broadcast picks up from the stands on a big play. One draw of points
 * whose timing runs in the shader from the crowd's own clock.
 */
export class CrowdFlashes {
  readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;

  constructor(seats: readonly Seat[], uniforms: { uTime: { value: number }; uExcite: { value: number } }) {
    const chosen = seats.filter((_, i) => i % EVERY === 3);
    const pos = new Float32Array(chosen.length * 3);
    const phase = new Float32Array(chosen.length);
    chosen.forEach((seat, i) => {
      pos.set([seat.x + Math.sin(seat.yaw) * 0.2, seat.y + 1.25, seat.z + Math.cos(seat.yaw) * 0.2], i * 3);
      phase[i] = seat.luck * 17.3;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uTime: uniforms.uTime, uExcite: uniforms.uExcite, uScale: { value: 900 } },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
