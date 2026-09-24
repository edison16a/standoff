import * as THREE from "three";

export interface ParticleOptions {
  max: number;
  /** World size of each point. */
  size: number;
  map: THREE.Texture;
  additive: boolean;
  /** Metres per second squared pulling down. */
  gravity: number;
  /** How much speed is kept each second, 0 to 1. */
  drag: number;
}

/**
 * A pool of points that fly, fall and fade: turf kicked up by a slide,
 * sparks from fireworks, flames from the goal jets. One draw call per
 * pool; dead points are reused.
 */
export class Particles {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly vel: Float32Array;
  private readonly base: Float32Array;
  private readonly life: Float32Array;
  private readonly span: Float32Array;
  private next = 0;

  constructor(private readonly o: ParticleOptions) {
    this.pos = new Float32Array(o.max * 3).fill(-999);
    this.col = new Float32Array(o.max * 3);
    this.vel = new Float32Array(o.max * 3);
    this.base = new Float32Array(o.max * 3);
    this.life = new Float32Array(o.max);
    this.span = new Float32Array(o.max).fill(1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.PointsMaterial({
      size: o.size,
      map: o.map,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      alphaTest: o.additive ? 0 : 0.2,
      toneMapped: !o.additive,
    });
    this.points = new THREE.Points(geo, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = o.additive ? 12 : 6;
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, colour: THREE.Color, life: number): void {
    const i = this.next;
    this.next = (this.next + 1) % this.o.max;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.base.set([colour.r, colour.g, colour.b], i * 3);
    this.col.set([colour.r, colour.g, colour.b], i * 3);
    this.life[i] = life;
    this.span[i] = life;
  }

  update(dt: number): void {
    const keep = Math.pow(this.o.drag, dt);
    for (let i = 0; i < this.o.max; i++) {
      if (this.life[i]! <= 0) continue;
      this.life[i]! -= dt;
      const j = i * 3;
      if (this.life[i]! <= 0) {
        this.pos[j + 1] = -999;
        continue;
      }
      this.vel[j]! *= keep;
      this.vel[j + 1] = this.vel[j + 1]! * keep - this.o.gravity * dt;
      this.vel[j + 2]! *= keep;
      this.pos[j]! += this.vel[j]! * dt;
      this.pos[j + 1]! += this.vel[j + 1]! * dt;
      this.pos[j + 2]! += this.vel[j + 2]! * dt;
      if (this.pos[j + 1]! < 0.02 && !this.o.additive) {
        this.pos[j + 1] = 0.02;
        this.vel[j] = this.vel[j + 1] = this.vel[j + 2] = 0;
      }
      // Additive sparks fade by darkening; turf chunks just stay until they vanish.
      const fade = this.o.additive ? Math.min(1, (this.life[i]! / this.span[i]!) * 1.6) : 1;
      this.col[j] = this.base[j]! * fade;
      this.col[j + 1] = this.base[j + 1]! * fade;
      this.col[j + 2] = this.base[j + 2]! * fade;
    }
    this.points.geometry.getAttribute("position").needsUpdate = true;
    this.points.geometry.getAttribute("color").needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
