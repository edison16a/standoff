import * as THREE from "three";

export interface Emit {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  size: number;
  color: THREE.ColorRepresentation;
  /** Metres per second squared, downward. */
  gravity?: number;
  /** Size at the end of life as a share of the start. */
  grow?: number;
  /** Share of speed kept each second, for puffs that slow and hang. */
  drag?: number;
}

const VERTEX = /* glsl */ `
  attribute float size;
  attribute vec4 tint;
  varying vec4 vTint;
  uniform float scale;
  void main() {
    vTint = tint;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * scale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  varying vec4 vTint;
  void main() {
    vec4 texel = texture2D(map, gl_PointCoord);
    gl_FragColor = vec4(vTint.rgb * texel.rgb, vTint.a * texel.a);
    if (gl_FragColor.a < 0.01) discard;
  }
`;

/**
 * A pool of sprites drawn as one set of points: coin sparkles, crash
 * sparks, dust and puffs. Updating is plain array work on the CPU, and
 * the whole pool is one draw call.
 */
export class Particles {
  readonly points: THREE.Points;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly tint: Float32Array;
  private readonly size: Float32Array;
  private readonly base: Float32Array;
  /** Per particle: age, life, gravity, grow, drag. */
  private readonly life: Float32Array;
  private next = 0;
  private readonly color = new THREE.Color();

  constructor(
    private readonly capacity: number,
    map: THREE.Texture,
    additive: boolean,
  ) {
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.tint = new Float32Array(capacity * 4);
    this.size = new Float32Array(capacity);
    this.base = new Float32Array(capacity);
    this.life = new Float32Array(capacity * 5);
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("tint", new THREE.BufferAttribute(this.tint, 4).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, scale: { value: 400 } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2;
  }

  /** Points are sized in pixels, so they follow the height of the view they are drawn in. */
  setViewHeight(pixels: number): void {
    (this.points.material as THREE.ShaderMaterial).uniforms.scale!.value = pixels * 0.9;
  }

  emit(e: Emit): void {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    this.pos.set([e.x, e.y, e.z], i * 3);
    this.vel.set([e.vx, e.vy, e.vz], i * 3);
    this.color.set(e.color);
    this.tint.set([this.color.r, this.color.g, this.color.b, 1], i * 4);
    this.base[i] = e.size;
    this.size[i] = e.size;
    this.life.set([0, e.life, e.gravity ?? 0, e.grow ?? 1, e.drag ?? 1], i * 5);
  }

  update(dt: number): void {
    for (let i = 0; i < this.capacity; i++) {
      const l = i * 5;
      const lifeS = this.life[l + 1]!;
      if (lifeS <= 0) continue;
      const age = (this.life[l] = this.life[l]! + dt);
      if (age >= lifeS) {
        this.life[l + 1] = 0;
        this.size[i] = 0;
        this.tint[i * 4 + 3] = 0;
        continue;
      }
      const k = age / lifeS;
      const drag = Math.pow(this.life[l + 4]!, dt);
      const p = i * 3;
      this.vel[p]! *= drag;
      this.vel[p + 1] = this.vel[p + 1]! * drag - this.life[l + 2]! * dt;
      this.vel[p + 2]! *= drag;
      this.pos[p]! += this.vel[p]! * dt;
      this.pos[p + 1]! += this.vel[p + 1]! * dt;
      this.pos[p + 2]! += this.vel[p + 2]! * dt;
      this.size[i] = this.base[i]! * (1 + (this.life[l + 3]! - 1) * k);
      // Fade in fast and out slowly.
      this.tint[i * 4 + 3] = Math.min(1, k * 12) * (1 - k * k);
    }
    for (const name of ["position", "tint", "size"]) this.geometry.attributes[name]!.needsUpdate = true;
  }

  clear(): void {
    this.life.fill(0);
    this.size.fill(0);
    this.tint.fill(0);
  }

  dispose(): void {
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
