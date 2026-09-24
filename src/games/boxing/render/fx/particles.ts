import * as THREE from "three";

export interface ParticleSpec {
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  /** Seconds. */
  life: number;
  size: number;
  /** Size multiplier reached at the end of life. */
  grow?: number;
  color: THREE.ColorRepresentation;
  /** Metres per second squared, downward. */
  gravity?: number;
  /** Share of speed kept per second. */
  drag?: number;
  alpha?: number;
  /** Bounces off the canvas at y 0 instead of falling through, for confetti and sweat. */
  floor?: boolean;
}

interface State {
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
  grow: number;
  gravity: number;
  drag: number;
  alpha: number;
  floor: boolean;
}

const colour = new THREE.Color();

/**
 * A fixed pool of sprites drawn as one point cloud: sparks, sweat, dust
 * and camera flashes all come from pools like this. Nothing allocates
 * once built, and a full pool reuses its oldest particle.
 */
export class Particles {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly state: State[] = [];
  private next = 0;
  private live = 0;

  constructor(
    private readonly max: number,
    map: THREE.Texture,
    additive: boolean,
  ) {
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    for (let i = 0; i < max; i++) this.state.push({ vx: 0, vy: 0, vz: 0, age: 1, life: 0, size: 0, grow: 1, gravity: 0, drag: 1, alpha: 0, floor: false });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("size", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("alpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { map: { value: map }, scale: { value: 500 } },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float scale;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);
          #include <colorspace_fragment>
        }`,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
  }

  /** The view's focal length in pixels, so sprite sizes are in metres. */
  setViewHeight(pixels: number): void {
    this.material.uniforms.scale!.value = pixels;
  }

  spawn(spec: ParticleSpec): void {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    const s = this.state[i]!;
    s.vx = spec.vx ?? 0;
    s.vy = spec.vy ?? 0;
    s.vz = spec.vz ?? 0;
    s.age = 0;
    s.life = spec.life;
    s.size = spec.size;
    s.grow = spec.grow ?? 1;
    s.gravity = spec.gravity ?? 0;
    s.drag = spec.drag ?? 1;
    s.alpha = spec.alpha ?? 1;
    s.floor = spec.floor ?? false;
    this.pos.set([spec.x, spec.y, spec.z], i * 3);
    colour.set(spec.color);
    this.col.set([colour.r, colour.g, colour.b], i * 3);
    this.live = this.max;
  }

  update(dt: number): void {
    if (this.live === 0) return;
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      const s = this.state[i]!;
      if (s.age >= s.life) {
        this.alpha[i] = 0;
        continue;
      }
      alive++;
      s.age += dt;
      const k = Math.pow(s.drag, dt);
      s.vx *= k;
      s.vy = s.vy * k - s.gravity * dt;
      s.vz *= k;
      const p = i * 3;
      this.pos[p] += s.vx * dt;
      this.pos[p + 1] += s.vy * dt;
      this.pos[p + 2] += s.vz * dt;
      if (s.floor && this.pos[p + 1]! < 0.01) {
        // Settles on the canvas and slides to a stop.
        this.pos[p + 1] = 0.01;
        s.vy = Math.abs(s.vy) * 0.15;
        s.vx *= 0.5;
        s.vz *= 0.5;
      }
      const t = Math.min(1, s.age / s.life);
      this.size[i] = s.size * (1 + (s.grow - 1) * t);
      // Fades out over the last part of its life.
      this.alpha[i] = s.alpha * Math.min(1, (1 - t) * 3);
    }
    this.live = alive;
    const geo = this.points.geometry;
    for (const name of ["position", "size", "alpha", "color"]) geo.getAttribute(name).needsUpdate = true;
  }

  clear(): void {
    for (const s of this.state) s.age = s.life = 1;
    this.alpha.fill(0);
    this.points.geometry.getAttribute("alpha").needsUpdate = true;
    this.live = 0;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
