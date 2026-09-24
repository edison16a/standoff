import * as THREE from "three";
import { glowTexture } from "../textures";

/**
 * A pool of small glowing particles: sparks off metal and stone, or
 * gobs of green goo from the dead. One draw call for the whole pool.
 * Each particle flies, falls under gravity and fades.
 */
export class Particles {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly colours: Float32Array;
  private readonly velocity: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly base: Float32Array;
  private next = 0;

  constructor(
    private readonly capacity: number,
    size: number,
    additive: boolean,
    private readonly gravity: number,
  ) {
    this.positions = new Float32Array(capacity * 3);
    this.colours = new Float32Array(capacity * 3);
    this.base = new Float32Array(capacity * 3);
    this.velocity = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(this.colours, 3).setUsage(THREE.DynamicDrawUsage));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const material = new THREE.PointsMaterial({
      size,
      map: glowTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      sizeAttenuation: true,
      fog: false,
    });
    this.points = new THREE.Points(geo, material);
    this.points.frustumCulled = false;
    for (let i = 0; i < capacity; i++) this.positions[i * 3 + 1] = -9999;
  }

  /** Throws `count` particles from a point, in a spray around `dir`. */
  burst(at: THREE.Vector3, dir: THREE.Vector3, count: number, speed: number, spread: number, colour: THREE.Color, life = 0.6): void {
    for (let n = 0; n < count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % this.capacity;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.positions.set([at.x, at.y, at.z], i * 3);
      this.velocity.set(
        [
          (dir.x + (Math.random() - 0.5) * spread) * s,
          (dir.y + (Math.random() - 0.3) * spread) * s,
          (dir.z + (Math.random() - 0.5) * spread) * s,
        ],
        i * 3,
      );
      const shade = 0.7 + Math.random() * 0.3;
      this.base.set([colour.r * shade, colour.g * shade, colour.b * shade], i * 3);
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.6);
    }
  }

  update(dt: number): void {
    let alive = false;
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i]! <= 0) continue;
      alive = true;
      this.life[i]! -= dt;
      const k = i * 3;
      this.velocity[k + 1]! -= this.gravity * dt;
      this.positions[k]! += this.velocity[k]! * dt;
      this.positions[k + 1]! += this.velocity[k + 1]! * dt;
      this.positions[k + 2]! += this.velocity[k + 2]! * dt;
      const fade = Math.max(0, this.life[i]! / this.maxLife[i]!);
      this.colours[k] = this.base[k]! * fade;
      this.colours[k + 1] = this.base[k + 1]! * fade;
      this.colours[k + 2] = this.base[k + 2]! * fade;
      if (this.life[i]! <= 0) this.positions[k + 1] = -9999;
    }
    if (!alive) return;
    this.points.geometry.attributes.position!.needsUpdate = true;
    this.points.geometry.attributes.color!.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
