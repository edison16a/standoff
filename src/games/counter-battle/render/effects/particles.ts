import * as THREE from "three";
import { dotTexture } from "../textures";

export interface Burst {
  at: THREE.Vector3;
  count: number;
  colour: THREE.ColorRepresentation;
  /** Launch speed range, metres per second. */
  speed: [number, number];
  /** A general direction every particle leans along, scaled by `push`. */
  dir?: THREE.Vector3;
  push?: number;
  /** How far launches scatter away from `dir`, 0 tight to 1 every way. */
  spread?: number;
  life: [number, number];
  size: [number, number];
  gravity?: number;
  drag?: number;
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
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
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
 * A pool of soft points for puffs, paint spray, turf bits, sparks and
 * spent cases, all in one draw. Each point flies, falls, slows and fades.
 * The random source is passed in, so a seeded showcase films the same.
 */
export class Particles {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly colour: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly life: Float32Array;
  private readonly age: Float32Array;
  private readonly base: Float32Array;
  private readonly physics: Float32Array;
  private next = 0;
  private readonly uniforms: { uMap: { value: THREE.Texture }; uScale: { value: number } };

  constructor(private readonly max: number, additive: boolean) {
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.colour = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.life = new Float32Array(max);
    this.age = new Float32Array(max).fill(1e9);
    this.base = new Float32Array(max);
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
    this.points.renderOrder = 5;
  }

  /** Sizes are in metres: this scales them for a view's height in pixels and its lens. */
  setView(heightPx: number, fovDeg: number): void {
    this.uniforms.uScale.value = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  burst(b: Burst, rand: () => number): void {
    const col = new THREE.Color(b.colour);
    const spread = b.spread ?? 1;
    for (let n = 0; n < b.count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      // A random direction, pulled toward `dir` by how tight the spread is.
      const theta = rand() * Math.PI * 2;
      const y = rand() * 2 - 1;
      const r = Math.sqrt(1 - y * y);
      let dx = Math.cos(theta) * r * spread;
      let dy = y * spread;
      let dz = Math.sin(theta) * r * spread;
      if (b.dir) {
        dx += b.dir.x * (1 - spread);
        dy += b.dir.y * (1 - spread);
        dz += b.dir.z * (1 - spread);
      }
      const speed = b.speed[0] + (b.speed[1] - b.speed[0]) * rand();
      const push = b.push ?? 0;
      this.pos.set([b.at.x, b.at.y, b.at.z], i * 3);
      this.vel.set([dx * speed + (b.dir?.x ?? 0) * push, dy * speed + (b.dir?.y ?? 0) * push, dz * speed + (b.dir?.z ?? 0) * push], i * 3);
      this.colour.set([col.r, col.g, col.b], i * 3);
      this.life[i] = b.life[0] + (b.life[1] - b.life[0]) * rand();
      this.age[i] = 0;
      this.base[i] = b.size[0] + (b.size[1] - b.size[0]) * rand();
      this.physics[i * 2] = b.gravity ?? 9.8;
      this.physics[i * 2 + 1] = b.drag ?? 0.4;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.max; i++) {
      const span = this.life[i]!;
      const lived = this.age[i]! + dt;
      if (lived - dt >= span) {
        this.alpha[i] = 0;
        this.size[i] = 0;
        continue;
      }
      this.age[i] = lived;
      const k = lived / span;
      const keep = Math.pow(this.physics[i * 2 + 1]!, dt);
      const j = i * 3;
      this.vel[j] = this.vel[j]! * keep;
      this.vel[j + 1] = this.vel[j + 1]! * keep - this.physics[i * 2]! * dt;
      this.vel[j + 2] = this.vel[j + 2]! * keep;
      this.pos[j] = this.pos[j]! + this.vel[j]! * dt;
      // Points stop on the turf rather than falling through it.
      this.pos[j + 1] = Math.max(0.02, this.pos[j + 1]! + this.vel[j + 1]! * dt);
      this.pos[j + 2] = this.pos[j + 2]! + this.vel[j + 2]! * dt;
      this.alpha[i] = 1 - k * k;
      this.size[i] = this.base[i]! * (1 - k * 0.5);
    }
    const geo = this.points.geometry;
    for (const name of ["position", "aSize", "aAlpha", "aColour"]) geo.getAttribute(name).needsUpdate = true;
  }

  clear(): void {
    this.age.fill(1e9);
    this.alpha.fill(0);
    this.size.fill(0);
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.uniforms.uMap.value.dispose();
  }
}
