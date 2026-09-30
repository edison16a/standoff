import * as THREE from "three";
import { flashTexture, glowTexture } from "../../render/textures";

const LIFE = 0.08;
const POOL = 12;

interface Bloom {
  core: THREE.Sprite;
  glow: THREE.Sprite;
  born: number;
  size: number;
}

/**
 * Big muzzle blooms for the trailer. The game's own flash is sized for
 * a gun a metre from your eye; seen from across the street it vanishes,
 * so the trailer adds a burst of light that reads at any distance. Each
 * lives a few story frames, timed by story time, so slow motion holds it.
 */
export class Blooms {
  readonly group = new THREE.Group();
  private readonly pool: Bloom[] = [];
  private next = 0;

  constructor() {
    for (let i = 0; i < POOL; i++) {
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), color: 0xfff0c8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      core.visible = glow.visible = false;
      this.group.add(core, glow);
      this.pool.push({ core, glow, born: -Infinity, size: 0 });
    }
  }

  spawn(at: THREE.Vector3, big: boolean, story: number): void {
    const bloom = this.pool[this.next]!;
    this.next = (this.next + 1) % POOL;
    bloom.core.position.copy(at);
    bloom.glow.position.copy(at);
    bloom.born = story;
    bloom.size = big ? 0.9 : 0.6;
    bloom.core.material.rotation = story * 37;
  }

  update(story: number): void {
    for (const bloom of this.pool) {
      const age = story - bloom.born;
      const on = age >= 0 && age < LIFE;
      bloom.core.visible = bloom.glow.visible = on;
      if (!on) continue;
      const k = 1 - age / LIFE;
      bloom.core.scale.setScalar(bloom.size * (0.7 + 0.3 * k));
      bloom.glow.scale.setScalar(bloom.size * 2.6);
      bloom.core.material.opacity = k;
      bloom.glow.material.opacity = 0.55 * k;
    }
  }

  /** Forgets every bloom, for a clean cut. */
  clear(): void {
    for (const bloom of this.pool) bloom.born = -Infinity;
  }

  dispose(): void {
    for (const bloom of this.pool) {
      bloom.core.material.dispose();
      bloom.glow.material.dispose();
    }
  }
}
