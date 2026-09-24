import * as THREE from "three";
import { glowTexture, puffTexture } from "../textures";

interface Puff {
  sprite: THREE.Sprite;
  start: number;
  life: number;
  from: number;
  to: number;
  drift: THREE.Vector3;
  alpha: number;
}

export interface PuffOptions {
  colour: string;
  size: number;
  grow: number;
  life: number;
  alpha: number;
  /** Additive puffs glow (muzzle flash); the rest are smoke or dust. */
  glow?: boolean;
  drift?: THREE.Vector3;
}

/**
 * Soft billboards that swell and fade: the little cloud of air and dust
 * out of the muzzle, the flash with it, and dust where a BB strikes wood
 * or cloth.
 */
export class Puffs {
  readonly object = new THREE.Group();
  private readonly active: Puff[] = [];
  private readonly spare: { smoke: Puff[]; glow: Puff[] } = { smoke: [], glow: [] };
  private readonly smokeMap = puffTexture();
  private readonly glowMap = glowTexture();

  spawn(at: THREE.Vector3, now: number, options: PuffOptions): void {
    const pool = options.glow ? this.spare.glow : this.spare.smoke;
    const puff = pool.pop() ?? this.make(options.glow === true);
    const material = puff.sprite.material;
    material.color.set(options.colour);
    material.rotation = Math.random() * Math.PI * 2;
    puff.sprite.position.copy(at);
    puff.sprite.visible = true;
    puff.start = now;
    puff.life = options.life;
    puff.from = options.size;
    puff.to = options.size * options.grow;
    puff.alpha = options.alpha;
    puff.drift.copy(options.drift ?? new THREE.Vector3(0, 0.25, 0));
    this.active.push(puff);
  }

  update(now: number, dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const puff = this.active[i]!;
      const t = (now - puff.start) / puff.life;
      if (t >= 1) {
        puff.sprite.visible = false;
        this.active.splice(i, 1);
        (puff.sprite.material.blending === THREE.AdditiveBlending ? this.spare.glow : this.spare.smoke).push(puff);
        continue;
      }
      const ease = 1 - (1 - t) * (1 - t);
      puff.sprite.scale.setScalar(puff.from + (puff.to - puff.from) * ease);
      puff.sprite.material.opacity = puff.alpha * (1 - t) * (1 - t);
      puff.sprite.position.addScaledVector(puff.drift, dt);
      puff.drift.multiplyScalar(Math.exp(-dt * 3));
    }
  }

  private make(glow: boolean): Puff {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow ? this.glowMap : this.smokeMap,
        transparent: true,
        depthWrite: false,
        blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    );
    sprite.renderOrder = 3;
    this.object.add(sprite);
    return { sprite, start: 0, life: 1, from: 1, to: 1, drift: new THREE.Vector3(), alpha: 1 };
  }
}
