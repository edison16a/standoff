import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
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
  /** The colour it cools to by the end of its life, as fire turns to soot. Defaults to `color`. */
  to?: Color | string;
  /** Multiplies the size by the end of its life, for puffs that swell or sparks that shrink. */
  grow?: number;
  /** Downward pull. Negative floats up, like embers. */
  gravity?: number;
  /** Fraction of speed lost per second. */
  drag?: number;
  alpha?: number;
  /** Seconds before it shows, so one call can stage a whole effect. */
  delay?: number;
  /** Turn speed in radians per second. Puffs that slowly roll never look like the same sprite twice. */
  spin?: number;
  /** Share of its life it stays at full strength before fading, for fire and smoke that must read as solid. */
  hold?: number;
}

/** What each particle carries: the emit settings filled in, plus its age, turn and both colours as numbers. */
interface Particle extends Required<Omit<Emit, "color" | "to" | "delay">> {
  age: number;
  angle: number;
  r: number;
  g: number;
  b: number;
  r2: number;
  g2: number;
  b2: number;
}

/**
 * Each particle is a small square turned to face the camera. Quads rather
 * than GL points, because points have a size limit that differs between
 * graphics cards (a big fireball would shrink on some), and cannot turn.
 */
const VERTEX = /* glsl */ `
  attribute vec4 aSpot;
  attribute vec4 aColor;
  attribute float aSize;
  varying vec4 vColor;
  varying vec2 vUv;
  void main() {
    vec4 mv = modelViewMatrix * vec4(aSpot.xyz, 1.0);
    float c = cos(aSpot.w);
    float s = sin(aSpot.w);
    mv.xy += vec2(position.x * c - position.y * s, position.x * s + position.y * c) * aSize;
    gl_Position = projectionMatrix * mv;
    vUv = uv;
    vColor = aColor;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  varying vec4 vColor;
  varying vec2 vUv;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    gl_FragColor = vec4(vColor.rgb * tex.rgb, tex.a * vColor.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const scratch = new Color();
const cool = new Color();

/**
 * A pool of camera facing sprites drawn in one call: sparks, glitter,
 * embers, fire and smoke. Every particle has its own colour, size, turn
 * and fade, which plain three.js sprites cannot do in one draw call.
 */
export class Particles {
  readonly mesh: Mesh;
  private readonly list: Particle[] = [];
  private readonly spots: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly geo: InstancedBufferGeometry;

  constructor(
    map: Texture,
    private readonly capacity: number,
    blending: Blending = AdditiveBlending,
  ) {
    this.spots = new Float32Array(capacity * 4);
    this.colors = new Float32Array(capacity * 4);
    this.sizes = new Float32Array(capacity);
    const quad = new PlaneGeometry(1, 1);
    this.geo = new InstancedBufferGeometry();
    this.geo.index = quad.index;
    this.geo.setAttribute("position", quad.getAttribute("position"));
    this.geo.setAttribute("uv", quad.getAttribute("uv"));
    this.geo.setAttribute("aSpot", new InstancedBufferAttribute(this.spots, 4).setUsage(DynamicDrawUsage));
    this.geo.setAttribute("aColor", new InstancedBufferAttribute(this.colors, 4).setUsage(DynamicDrawUsage));
    this.geo.setAttribute("aSize", new InstancedBufferAttribute(this.sizes, 1).setUsage(DynamicDrawUsage));
    this.geo.instanceCount = 0;
    const material = new ShaderMaterial({
      uniforms: { uMap: { value: map } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending,
    });
    this.mesh = new Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = blending === AdditiveBlending ? 20 : 10;
  }

  emit(e: Emit): void {
    if (this.list.length >= this.capacity) this.list.shift();
    scratch.set(e.color);
    cool.set(e.to ?? e.color);
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
      age: -(e.delay ?? 0),
      angle: Math.random() * Math.PI * 2,
      spin: e.spin ?? 0,
      hold: e.hold ?? 0,
      r: scratch.r,
      g: scratch.g,
      b: scratch.b,
      r2: cool.r,
      g2: cool.g,
      b2: cool.b,
    });
  }

  update(dt: number): void {
    let n = 0;
    let shown = 0;
    for (const p of this.list) {
      p.age += dt;
      if (p.age >= p.life) continue;
      this.list[n++] = p;
      // A delayed particle waits where it was put, unseen.
      if (p.age < 0) continue;
      const keep = Math.max(0, 1 - p.drag * dt);
      p.vx *= keep;
      p.vy = p.vy * keep - p.gravity * dt;
      p.vz *= keep;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.angle += p.spin * dt;
      const k = p.age / p.life;
      // Quick in, slow out, so a burst pops and then lingers.
      const tail = k < p.hold ? 1 : (1 - k) / (1 - p.hold);
      const fade = Math.min(1, k * 12) * tail * tail;
      const i4 = shown * 4;
      this.spots[i4] = p.x;
      this.spots[i4 + 1] = p.y;
      this.spots[i4 + 2] = p.z;
      this.spots[i4 + 3] = p.angle;
      this.colors[i4] = p.r + (p.r2 - p.r) * k;
      this.colors[i4 + 1] = p.g + (p.g2 - p.g) * k;
      this.colors[i4 + 2] = p.b + (p.b2 - p.b) * k;
      this.colors[i4 + 3] = fade * p.alpha;
      this.sizes[shown] = p.size * (1 + (p.grow - 1) * k);
      shown++;
    }
    this.list.length = n;
    this.geo.instanceCount = shown;
    for (const name of ["aSpot", "aColor", "aSize"]) {
      const attribute = this.geo.getAttribute(name) as InstancedBufferAttribute;
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, shown * attribute.itemSize);
      attribute.needsUpdate = true;
    }
  }

  clear(): void {
    this.list.length = 0;
    this.geo.instanceCount = 0;
  }

  dispose(): void {
    this.geo.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
  }
}
