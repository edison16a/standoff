import * as THREE from "three";
import { seeded } from "../../engine/random";
import { glowTexture, paint } from "../arena/arena-textures";
import { Particles } from "./particles";

/** A soft round droplet, lighter in the middle, for sweat that is not additive. */
function dropTexture(): THREE.CanvasTexture {
  return paint(32, 32, (ctx) => {
    const g = ctx.createRadialGradient(13, 12, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(220,235,255,0.8)");
    g.addColorStop(1, "rgba(200,220,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });
}

/**
 * What a punch leaves in the air: hot sparks and a white flash where it
 * lands, a spray of sweat flung off the head the way the punch travelled,
 * and a puff of chalk off the gloves on a block. Seeded, so replays and
 * the showcase throw the same sparks every time.
 */
export class HitFx {
  readonly group = new THREE.Group();
  private readonly sparks: Particles;
  private readonly sweat: Particles;
  private readonly textures: THREE.Texture[];
  private readonly random = seeded(1234);
  private readonly tmp = new THREE.Vector3();

  constructor() {
    const glow = glowTexture();
    const drop = dropTexture();
    this.textures = [glow, drop];
    this.sparks = new Particles(700, glow, true);
    this.sweat = new Particles(500, drop, false);
    this.group.add(this.sweat.points, this.sparks.points);
  }

  setViewHeight(pixels: number): void {
    this.sparks.setViewHeight(pixels);
    this.sweat.setViewHeight(pixels);
  }

  /**
   * A punch landing at `at`, travelling along `direction`. `power` is 0 to
   * about 2.5, where a counter or a knockdown blow is the top.
   */
  hit(at: THREE.Vector3, direction: THREE.Vector3, power: number): void {
    const r = this.random;
    const heat = Math.min(1, power / 2);
    this.sparks.spawn({ x: at.x, y: at.y, z: at.z, life: 0.16, size: 0.5 + 0.5 * heat, grow: 1.8, color: "#fff6e0" });
    const count = Math.round(18 + 50 * heat);
    for (let i = 0; i < count; i++) {
      const v = this.spray(direction, 2.5 + 5 * r() * (0.6 + heat), 1.1);
      const colour = r() < 0.3 ? "#ffffff" : r() < 0.6 ? "#ffd27a" : "#ff8a3a";
      this.sparks.spawn({ x: at.x, y: at.y, z: at.z, vx: v.x, vy: v.y, vz: v.z, life: 0.25 + r() * 0.35, size: 0.02 + r() * 0.035, grow: 0.3, color: colour, gravity: 6, drag: 0.08 });
    }
    const drops = Math.round(14 + 40 * heat);
    for (let i = 0; i < drops; i++) {
      const v = this.spray(direction, 1.2 + 3.2 * r() * (0.5 + heat), 0.9);
      this.sweat.spawn({ x: at.x, y: at.y + 0.02, z: at.z, vx: v.x, vy: v.y + 0.8, vz: v.z, life: 0.7 + r() * 0.6, size: 0.012 + r() * 0.025, color: "#dfeaff", gravity: 9.8, drag: 0.5, alpha: 0.75, floor: true });
    }
  }

  /** Gloves meeting gloves: a small white burst and a puff of dust, no sweat. */
  block(at: THREE.Vector3, direction: THREE.Vector3): void {
    const r = this.random;
    this.sparks.spawn({ x: at.x, y: at.y, z: at.z, life: 0.12, size: 0.28, grow: 1.6, color: "#dfe9ff" });
    for (let i = 0; i < 14; i++) {
      const v = this.spray(direction, 1 + 2 * r(), 1.6);
      this.sparks.spawn({ x: at.x, y: at.y, z: at.z, vx: v.x, vy: v.y, vz: v.z, life: 0.2 + r() * 0.2, size: 0.018 + r() * 0.02, color: "#cfe0ff", gravity: 3, drag: 0.05 });
    }
  }

  update(dt: number): void {
    this.sparks.update(dt);
    this.sweat.update(dt);
  }

  clear(): void {
    this.sparks.clear();
    this.sweat.clear();
  }

  dispose(): void {
    this.sparks.dispose();
    this.sweat.dispose();
    for (const t of this.textures) t.dispose();
  }

  /** A random direction in a cone around `direction`, `spread` wide, at `speed`. */
  private spray(direction: THREE.Vector3, speed: number, spread: number): THREE.Vector3 {
    const r = this.random;
    return this.tmp
      .copy(direction)
      .add(new THREE.Vector3((r() - 0.5) * 2 * spread, (r() - 0.3) * 2 * spread, (r() - 0.5) * 2 * spread))
      .normalize()
      .multiplyScalar(speed);
  }
}
