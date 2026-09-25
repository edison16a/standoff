import * as THREE from "three";
import { dotTexture } from "./textures";

export interface Burst {
  x: number;
  y: number;
  z: number;
  count: number;
  colour: string;
  /** Launch speed range, metres per second. */
  speed: [number, number];
  /** Share of the launch that goes upward, 0 to 1. */
  up?: number;
  life: [number, number];
  size: [number, number];
  gravity?: number;
  drag?: number;
  /** A general heading added to every particle's launch. */
  push?: { x: number; y: number; z: number };
}

const VERT = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColour;
varying float vAlpha;
varying vec3 vColour;
uniform float uScale;
void main() {
  vAlpha = aAlpha;
  vColour = aColour;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform sampler2D uMap;
varying float vAlpha;
varying vec3 vColour;
void main() {
  vec4 t = texture2D(uMap, gl_PointCoord);
  gl_FragColor = vec4(vColour, t.a * vAlpha);
}`;

/**
 * A pool of points: sparks off a hit, dust off a landing, embers round
 * an ult, the blast of a KO. One draw for all of them. Each fades and
 * shrinks over its life.
 */
export class Particles {
  readonly points: THREE.Points;
  private readonly max: number;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly colour: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly life: Float32Array;
  private readonly age: Float32Array;
  private readonly baseSize: Float32Array;
  private readonly physics: Float32Array;
  private next = 0;
  private readonly uniforms: { uMap: { value: THREE.Texture }; uScale: { value: number } };

  constructor(max: number, additive: boolean) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.colour = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.life = new Float32Array(max);
    this.age = new Float32Array(max).fill(1e9);
    this.baseSize = new Float32Array(max);
    this.physics = new Float32Array(max * 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("aColour", new THREE.BufferAttribute(this.colour, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1));
    this.uniforms = { uMap: { value: dotTexture() }, uScale: { value: 600 } };
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }

  /** Point sizes are in metres; this scales them for the view's height in pixels and its field of view. */
  setView(heightPx: number, fovDeg: number): void {
    this.uniforms.uScale.value = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  burst(b: Burst, rng: () => number = Math.random): void {
    const col = new THREE.Color(b.colour);
    for (let n = 0; n < b.count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      const theta = rng() * Math.PI * 2;
      const up = b.up ?? 0.5;
      const y = up * 2 - 1 + (rng() - 0.5) * (1 - Math.abs(up * 2 - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const speed = b.speed[0] + (b.speed[1] - b.speed[0]) * rng();
      this.pos.set([b.x, b.y, b.z], i * 3);
      this.vel.set([Math.cos(theta) * r * speed + (b.push?.x ?? 0), y * speed + (b.push?.y ?? 0), Math.sin(theta) * r * speed + (b.push?.z ?? 0)], i * 3);
      this.colour.set([col.r, col.g, col.b], i * 3);
      this.life[i] = b.life[0] + (b.life[1] - b.life[0]) * rng();
      this.age[i] = 0;
      this.baseSize[i] = b.size[0] + (b.size[1] - b.size[0]) * rng();
      this.physics[i * 2] = b.gravity ?? 9.8;
      this.physics[i * 2 + 1] = b.drag ?? 0.5;
    }
  }

  update(dt: number): void {
    const { pos, vel, age, life } = this;
    for (let i = 0; i < this.max; i++) {
      const lived = (age[i] ?? 0) + dt;
      const span = life[i] ?? 0;
      if (lived - dt >= span) {
        this.alpha[i] = 0;
        this.size[i] = 0;
        continue;
      }
      age[i] = lived;
      const k = lived / span;
      const keep = Math.pow(this.physics[i * 2 + 1] ?? 1, dt);
      const vx = (vel[i * 3] ?? 0) * keep;
      const vy = (vel[i * 3 + 1] ?? 0) * keep - (this.physics[i * 2] ?? 0) * dt;
      const vz = (vel[i * 3 + 2] ?? 0) * keep;
      vel[i * 3] = vx;
      vel[i * 3 + 1] = vy;
      vel[i * 3 + 2] = vz;
      pos[i * 3] = (pos[i * 3] ?? 0) + vx * dt;
      pos[i * 3 + 1] = (pos[i * 3 + 1] ?? 0) + vy * dt;
      pos[i * 3 + 2] = (pos[i * 3 + 2] ?? 0) + vz * dt;
      this.alpha[i] = 1 - k * k;
      this.size[i] = (this.baseSize[i] ?? 0) * (1 - k * 0.6);
    }
    const geo = this.points.geometry;
    for (const name of ["position", "aSize", "aAlpha", "aColour"]) geo.getAttribute(name).needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.uniforms.uMap.value.dispose();
  }
}
