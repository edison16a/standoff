import * as THREE from "three";
import { glowSprite } from "./textures";

const CAPACITY = 2400;

export interface Spark {
  x: number;
  y: number;
  z?: number;
  vx: number;
  vy: number;
  vz?: number;
  life: number;
  size: number;
  colour: THREE.Color;
  /** Downward pull, in blocks per second squared. */
  gravity?: number;
  /** Share of speed lost per second. */
  drag?: number;
}

/**
 * Glowing points for trails, bursts and explosions, in one draw call.
 * A ring buffer: when full, the oldest point makes way for the newest.
 */
export class Particles {
  readonly points: THREE.Points;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private readonly position = new Float32Array(CAPACITY * 3);
  private readonly colour = new Float32Array(CAPACITY * 3);
  private readonly size = new Float32Array(CAPACITY);
  private readonly alpha = new Float32Array(CAPACITY);
  private readonly velocity = new Float32Array(CAPACITY * 3);
  private readonly life = new Float32Array(CAPACITY);
  private readonly full = new Float32Array(CAPACITY);
  private readonly pull = new Float32Array(CAPACITY * 2);
  private next = 0;

  constructor() {
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("colour", new THREE.BufferAttribute(this.colour, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("alpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: glowSprite() }, scale: { value: 300 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 colour;
        attribute float size;
        attribute float alpha;
        uniform float scale;
        varying vec3 vColour;
        varying float vAlpha;
        void main() {
          vColour = colour;
          vAlpha = alpha;
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / -view.z;
          gl_Position = projectionMatrix * view;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        varying vec3 vColour;
        varying float vAlpha;
        void main() {
          float a = texture2D(map, gl_PointCoord).a * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColour * a * 2.0, a);
        }
      `,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  /** Points get this big per block of distance, so they match the view's size in pixels. */
  setScale(pixelsPerUnitAtOne: number): void {
    this.material.uniforms.scale!.value = pixelsPerUnitAtOne;
  }

  spawn(s: Spark): void {
    const i = this.next;
    this.next = (this.next + 1) % CAPACITY;
    this.position.set([s.x, s.y, s.z ?? 0], i * 3);
    this.velocity.set([s.vx, s.vy, s.vz ?? 0], i * 3);
    this.colour.set([s.colour.r, s.colour.g, s.colour.b], i * 3);
    this.size[i] = s.size;
    this.life[i] = this.full[i] = s.life;
    this.pull[i * 2] = s.gravity ?? 0;
    this.pull[i * 2 + 1] = s.drag ?? 0;
    this.alpha[i] = 1;
  }

  update(dt: number): void {
    for (let i = 0; i < CAPACITY; i++) {
      if (this.life[i]! <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      this.life[i]! -= dt;
      const k = Math.max(0, 1 - this.pull[i * 2 + 1]! * dt);
      this.velocity[i * 3 + 1]! -= this.pull[i * 2]! * dt;
      for (let a = 0; a < 3; a++) {
        this.velocity[i * 3 + a]! *= k;
        this.position[i * 3 + a]! += this.velocity[i * 3 + a]! * dt;
      }
      const left = Math.max(0, this.life[i]! / this.full[i]!);
      this.alpha[i] = Math.min(1, left * 1.6);
    }
    for (const name of ["position", "colour", "size", "alpha"]) this.geometry.getAttribute(name).needsUpdate = true;
  }

  clear(): void {
    this.life.fill(0);
    this.alpha.fill(0);
  }

  dispose(): void {
    this.geometry.dispose();
    (this.material.uniforms.map!.value as THREE.Texture).dispose();
    this.material.dispose();
  }
}
