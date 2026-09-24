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
  /** Size multiplier reached at the end of life, for puffs that swell. */
  grow?: number;
  color: THREE.ColorRepresentation;
  /** Metres per second squared downward. */
  gravity?: number;
  /** Share of speed kept per second. */
  drag?: number;
  alpha?: number;
}

const color = new THREE.Color();

/**
 * A pool of sprites drawn as one point cloud: sparks, smoke, flames,
 * stars and snow all come from here. Particles live in a fixed size
 * buffer that is rewritten every frame, so effects never allocate while
 * racing. Additive pools glow; normal ones are for smoke and dust.
 */
export class Particles {
  readonly points: THREE.Points;
  private readonly max: number;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly state: { vx: number; vy: number; vz: number; age: number; life: number; size: number; grow: number; gravity: number; drag: number; alpha: number }[] = [];
  private next = 0;
  readonly material: THREE.ShaderMaterial;

  constructor(max: number, map: THREE.Texture, additive: boolean) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    for (let i = 0; i < max; i++) this.state.push({ vx: 0, vy: 0, vz: 0, age: 1, life: 0, size: 0, grow: 1, gravity: 0, drag: 1, alpha: 0 });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("size", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("alpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { map: { value: map }, scale: { value: 400 } },
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

  /** Point size is in metres; this converts for a view of the given pixel height. */
  setViewHeight(pixels: number, fovDeg: number): void {
    this.material.uniforms.scale!.value = pixels / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  emit(spec: ParticleSpec): void {
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
    this.pos.set([spec.x, spec.y, spec.z], i * 3);
    color.set(spec.color);
    this.col.set([color.r, color.g, color.b], i * 3);
  }

  update(dt: number): void {
    for (let i = 0; i < this.max; i++) {
      const s = this.state[i]!;
      if (s.age >= s.life) {
        this.alpha[i] = 0;
        continue;
      }
      s.age += dt;
      const keep = Math.pow(s.drag, dt);
      s.vx *= keep;
      s.vz *= keep;
      s.vy = s.vy * keep - s.gravity * dt;
      this.pos[i * 3] = this.pos[i * 3]! + s.vx * dt;
      this.pos[i * 3 + 1] = this.pos[i * 3 + 1]! + s.vy * dt;
      this.pos[i * 3 + 2] = this.pos[i * 3 + 2]! + s.vz * dt;
      const t = Math.min(1, s.age / s.life);
      this.size[i] = s.size * (1 + (s.grow - 1) * t);
      // Quick fade in, long fade out.
      this.alpha[i] = s.alpha * Math.min(1, t * 8) * (1 - t);
    }
    const geo = this.points.geometry;
    for (const name of ["position", "color", "size", "alpha"]) geo.getAttribute(name).needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
