import * as THREE from "three";
import { puffTexture } from "./effect-textures";
import { billboardMaterial, billboardQuad, BILLBOARD_LAYOUT } from "./gpu/billboard-material";
import { put, QuadBatch } from "./gpu/quad-batch";

interface Puff {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  size: number;
  grow: number;
  rotation: number;
  spin: number;
  alpha: number;
  /** How hard it curls side to side as it rises, metres a second. */
  curl: number;
  phase: number;
}

/** A light breeze down the street, so smoke leans one way as it rises. */
const WIND = new THREE.Vector3(0.22, 0, 0.08);
/** Hot gas rises, metres per second squared. */
const LIFT = 0.45;
/** Air slows a puff's push quickly, a share per second. */
const DRAG = 2.6;

/**
 * Gun smoke: soft puffs that drift up and with the breeze, swell and thin
 * out. A shot leaves a burst at the muzzle, a hot barrel trails a thin
 * curling wisp, and a spent shotgun hull smokes a little as it falls.
 * The puffs are lit by the colour of the night air, so they sit in the
 * fog instead of glowing, and never write depth, so they never cut holes
 * in each other.
 */
export class Smoke {
  private readonly batch: QuadBatch;
  private readonly puffs: Puff[] = [];
  private next = 0;
  private readonly tint = new THREE.Color(0x80848c);

  constructor(
    private readonly random: () => number,
    low: boolean,
  ) {
    const capacity = low ? 100 : 320;
    this.batch = new QuadBatch(capacity, BILLBOARD_LAYOUT, billboardMaterial(puffTexture(), false), billboardQuad());
    for (let i = 0; i < capacity; i++) {
      this.puffs.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), age: 1, life: 0, size: 0, grow: 0, rotation: 0, spin: 0, alpha: 0, curl: 0, phase: 0 });
    }
  }

  get mesh(): THREE.Mesh {
    return this.batch.mesh;
  }

  /** The colour the puffs take from the air around them. */
  setTint(colour: THREE.Color): void {
    this.tint.copy(colour);
  }

  /** The cloud a shot leaves: puffs pushed out along the barrel, slowing fast, then rising. */
  muzzle(at: THREE.Vector3, dir: THREE.Vector3, count: number, scale: number): void {
    const r = this.random;
    for (let n = 0; n < count; n++) {
      const p = this.spawn(at);
      p.pos.addScaledVector(dir, r() * 0.12 * scale);
      const push = (1.2 + r() * 2.8) * scale;
      p.vel.copy(dir).multiplyScalar(push);
      p.vel.x += (r() - 0.5) * 0.5;
      p.vel.y += r() * 0.35;
      p.vel.z += (r() - 0.5) * 0.5;
      this.shape(p, 0.9 + r() * 0.8, 0.03 * scale, (0.22 + r() * 0.2) * scale, 0.3 + r() * 0.08, 0.08);
    }
  }

  /** One thin wisp curling up off a hot barrel. */
  wisp(at: THREE.Vector3): void {
    const r = this.random;
    const p = this.spawn(at);
    p.vel.set((r() - 0.5) * 0.06, 0.12 + r() * 0.1, (r() - 0.5) * 0.06);
    this.shape(p, 1.3 + r() * 0.7, 0.012, 0.09 + r() * 0.05, 0.2, 0.22);
  }

  /** A trail puff off a smoking hull in flight. */
  trail(at: THREE.Vector3): void {
    const r = this.random;
    const p = this.spawn(at);
    p.vel.set(0, 0.08 + r() * 0.08, 0);
    this.shape(p, 0.6 + r() * 0.4, 0.015, 0.08 + r() * 0.04, 0.12, 0.1);
  }

  update(dt: number): void {
    const { aCentre, aSizeRot, aColor } = this.batch.data as Record<keyof typeof BILLBOARD_LAYOUT, Float32Array>;
    const slow = Math.exp(-DRAG * dt);
    this.batch.begin();
    for (const p of this.puffs) {
      if (p.age >= p.life) continue;
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vel.multiplyScalar(slow);
      p.vel.y += LIFT * dt;
      const swirl = Math.sin(p.age * 5 + p.phase) * p.curl;
      p.pos.x += (p.vel.x + WIND.x + swirl) * dt;
      p.pos.y += p.vel.y * dt;
      p.pos.z += (p.vel.z + WIND.z + Math.cos(p.age * 4 + p.phase) * p.curl) * dt;
      p.rotation += p.spin * dt;
      const i = this.batch.take();
      if (i < 0) continue;
      const t = p.age / p.life;
      // Swells fast as the gas expands, then thins out as it spreads.
      const size = p.size + (p.grow - p.size) * Math.sqrt(t);
      const alpha = p.alpha * Math.min(1, p.age / 0.05) * Math.pow(1 - t, 1.6);
      put(aCentre, 3, i, p.pos.x, p.pos.y, p.pos.z);
      put(aSizeRot, 2, i, size, p.rotation);
      put(aColor, 4, i, this.tint.r, this.tint.g, this.tint.b, alpha);
    }
    this.batch.end();
  }

  dispose(): void {
    this.batch.dispose();
  }

  private spawn(at: THREE.Vector3): Puff {
    const p = this.puffs[this.next]!;
    this.next = (this.next + 1) % this.puffs.length;
    p.pos.copy(at);
    p.age = 0;
    return p;
  }

  private shape(p: Puff, life: number, size: number, grow: number, alpha: number, curl: number): void {
    const r = this.random;
    p.life = life;
    p.size = size;
    p.grow = grow;
    p.alpha = alpha;
    p.curl = curl;
    p.rotation = r() * Math.PI * 2;
    p.spin = (r() - 0.5) * 1.6;
    p.phase = r() * Math.PI * 2;
  }
}
