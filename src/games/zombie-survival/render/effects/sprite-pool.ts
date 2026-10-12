import * as THREE from "three";
import { billboardMaterial, billboardQuad, BILLBOARD_LAYOUT } from "./gpu/billboard-material";
import { put, QuadBatch } from "./gpu/quad-batch";

/** How one short lived sprite looks over its life. */
export interface SpriteLook {
  size: number;
  /** Size at the end of its life. The same as `size` for one that holds still. */
  grow: number;
  rotation: number;
  colour: THREE.Color;
  alpha: number;
  /** Seconds it lasts, fading out as it goes. */
  life: number;
  /**
   * When above zero it lasts exactly this many drawn frames at full
   * strength instead. A muzzle flash lives a frame or two on screen
   * whatever the frame rate, like the real one on a camera.
   */
  frames?: number;
}

interface Slot {
  x: number;
  y: number;
  z: number;
  size: number;
  grow: number;
  rotation: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
  age: number;
  life: number;
  frames: number;
}

/**
 * A fixed pool of camera facing sprites with one texture, drawn in one
 * call. The old effects made a sprite and a material per flash; this
 * reuses the oldest slot instead, so rapid fire allocates nothing.
 */
export class SpritePool {
  private readonly batch: QuadBatch;
  private readonly slots: Slot[] = [];
  private next = 0;

  constructor(capacity: number, texture: THREE.Texture, additive: boolean) {
    this.batch = new QuadBatch(capacity, BILLBOARD_LAYOUT, billboardMaterial(texture, additive), billboardQuad());
    for (let i = 0; i < capacity; i++) this.slots.push({ x: 0, y: 0, z: 0, size: 0, grow: 0, rotation: 0, r: 0, g: 0, b: 0, alpha: 0, age: 0, life: 0, frames: 0 });
  }

  get mesh(): THREE.Mesh {
    return this.batch.mesh;
  }

  spawn(at: THREE.Vector3, look: SpriteLook): void {
    const slot = this.slots[this.next]!;
    this.next = (this.next + 1) % this.slots.length;
    slot.x = at.x;
    slot.y = at.y;
    slot.z = at.z;
    slot.size = look.size;
    slot.grow = look.grow;
    slot.rotation = look.rotation;
    slot.r = look.colour.r;
    slot.g = look.colour.g;
    slot.b = look.colour.b;
    slot.alpha = look.alpha;
    slot.age = 0;
    slot.life = look.life;
    slot.frames = look.frames ?? 0;
  }

  update(dt: number): void {
    const { aCentre, aSizeRot, aColor } = this.batch.data as Record<keyof typeof BILLBOARD_LAYOUT, Float32Array>;
    this.batch.begin();
    for (const slot of this.slots) {
      let k: number;
      if (slot.frames > 0) {
        slot.frames -= 1;
        k = 1;
      } else {
        if (slot.age >= slot.life) continue;
        slot.age += dt;
        k = Math.max(0, 1 - slot.age / slot.life);
        if (k <= 0) continue;
      }
      const i = this.batch.take();
      if (i < 0) break;
      // Fast at first, easing out, as a pressure wave or a flare does.
      const t = 1 - k * k;
      put(aCentre, 3, i, slot.x, slot.y, slot.z);
      put(aSizeRot, 2, i, slot.size + (slot.grow - slot.size) * t, slot.rotation);
      put(aColor, 4, i, slot.r, slot.g, slot.b, slot.alpha * k);
    }
    this.batch.end();
  }

  dispose(): void {
    this.batch.dispose();
  }
}
