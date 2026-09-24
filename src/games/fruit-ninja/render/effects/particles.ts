import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
  type Blending,
  type Texture,
} from "three";

export interface Emit {
  x: number;
  y: number;
  z?: number;
  vx: number;
  vy: number;
  vz?: number;
  /** Seconds. */
  life: number;
  /** World units across. */
  size: number;
  color: Color | string;
  /** Multiplies the size by the end of its life, for puffs that swell or sparks that shrink. */
  grow?: number;
  /** Downward pull. Negative floats up, like embers. */
  gravity?: number;
  /** Fraction of speed lost per second. */
  drag?: number;
  alpha?: number;
}

interface Particle extends Required<Omit<Emit, "color">> {
  age: number;
  r: number;
  g: number;
  b: number;
}

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute vec4 aColor;
  uniform float uScale;
  uniform float uDistance;
  varying vec4 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale * uDistance / -mv.z;
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  varying vec4 vColor;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(vColor.rgb * tex.rgb, tex.a * vColor.a);
  }
`;

const scratch = new Color();

/**
 * A pool of sprite particles drawn in one call: sparks, glitter, embers,
 * fire and smoke. Every particle has its own colour, size and fade, which
 * plain three.js points cannot do, hence the small shader.
 */
export class Particles {
  readonly points: Points;
  private readonly list: Particle[] = [];
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly material: ShaderMaterial;

  constructor(
    map: Texture,
    private readonly capacity: number,
    blending: Blending = AdditiveBlending,
  ) {
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 4);
    this.sizes = new Float32Array(capacity);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage));
    geo.setAttribute("aColor", new BufferAttribute(this.colors, 4).setUsage(DynamicDrawUsage));
    geo.setAttribute("aSize", new BufferAttribute(this.sizes, 1).setUsage(DynamicDrawUsage));
    this.material = new ShaderMaterial({
      uniforms: { uMap: { value: map }, uScale: { value: 100 }, uDistance: { value: 15 } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending,
    });
    this.points = new Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = blending === AdditiveBlending ? 20 : 10;
  }

  /** Pixels per world unit at the flight plane, and the camera's distance to it. */
  setScale(scale: number, distance: number): void {
    this.material.uniforms.uScale!.value = scale;
    this.material.uniforms.uDistance!.value = distance;
  }

  emit(e: Emit): void {
    if (this.list.length >= this.capacity) this.list.shift();
    scratch.set(e.color);
    this.list.push({
      x: e.x,
      y: e.y,
      z: e.z ?? 0,
      vx: e.vx,
      vy: e.vy,
      vz: e.vz ?? 0,
      life: e.life,
      size: e.size,
      grow: e.grow ?? 1,
      gravity: e.gravity ?? 0,
      drag: e.drag ?? 0,
      alpha: e.alpha ?? 1,
      age: 0,
      r: scratch.r,
      g: scratch.g,
      b: scratch.b,
    });
  }

  update(dt: number): void {
    let n = 0;
    for (const p of this.list) {
      p.age += dt;
      if (p.age >= p.life) continue;
      const keep = Math.max(0, 1 - p.drag * dt);
      p.vx *= keep;
      p.vy = p.vy * keep - p.gravity * dt;
      p.vz *= keep;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const k = p.age / p.life;
      // Quick in, slow out, so a burst pops and then lingers.
      const fade = Math.min(1, k * 12) * (1 - k) * (1 - k);
      const i3 = n * 3;
      const i4 = n * 4;
      this.positions[i3] = p.x;
      this.positions[i3 + 1] = p.y;
      this.positions[i3 + 2] = p.z;
      this.colors[i4] = p.r;
      this.colors[i4 + 1] = p.g;
      this.colors[i4 + 2] = p.b;
      this.colors[i4 + 3] = fade * p.alpha;
      this.sizes[n] = p.size * (1 + (p.grow - 1) * k);
      this.list[n++] = p;
    }
    this.list.length = n;
    const geo = this.points.geometry;
    geo.setDrawRange(0, n);
    geo.getAttribute("position").needsUpdate = true;
    geo.getAttribute("aColor").needsUpdate = true;
    geo.getAttribute("aSize").needsUpdate = true;
  }

  clear(): void {
    this.list.length = 0;
  }
}
