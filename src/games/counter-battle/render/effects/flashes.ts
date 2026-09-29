import * as THREE from "three";
import type { GunId } from "../../engine/guns";
import { dotTexture } from "../textures";

/** How big each gun's puff of air grows, metres, and how long it hangs, seconds. */
const SIZE: Record<GunId, number> = { rifle: 0.22, smg: 0.18, shotgun: 0.42, sniper: 0.34 };
const LIFE = 0.28;

interface Puff {
  gun: THREE.Object3D;
  sprite: THREE.Sprite;
  at: THREE.Vector3;
  born: number;
  size: number;
}

/**
 * A paint marker has no flame: each shot blows a small puff of air out of
 * the barrel, a pale cloud that swells and thins as it drifts forward.
 * Pooled per fighter, one at a time each.
 */
export class Flashes {
  readonly group = new THREE.Group();
  private readonly texture = dotTexture();
  private readonly puffs = new Map<number, Puff>();

  /** A puff at `muzzle`, left behind where the shot went off. */
  fire(id: number, muzzle: THREE.Object3D, gun: GunId, now: number, spin: number): void {
    let f = this.puffs.get(id);
    if (!f) {
      const mat = new THREE.SpriteMaterial({ map: this.texture, color: "#eef3f6", transparent: true, depthWrite: false, opacity: 0 });
      const sprite = new THREE.Sprite(mat);
      sprite.renderOrder = 7;
      f = { gun: muzzle, sprite, at: new THREE.Vector3(), born: now, size: SIZE[gun] };
      this.puffs.set(id, f);
      this.group.add(sprite);
    }
    muzzle.updateWorldMatrix(true, false);
    muzzle.getWorldPosition(f.at);
    // Just ahead of the barrel, so it never hides inside the gun.
    f.at.add(new THREE.Vector3(0, 0, 0.06).applyQuaternion(muzzle.getWorldQuaternion(new THREE.Quaternion())));
    f.gun = muzzle;
    f.born = now;
    f.size = SIZE[gun] * (0.85 + 0.3 * spin);
    f.sprite.material.rotation = spin * Math.PI * 2;
  }

  update(now: number): void {
    for (const f of this.puffs.values()) {
      const t = (now - f.born) / LIFE;
      const on = t >= 0 && t < 1;
      f.sprite.visible = on;
      if (!on) continue;
      f.sprite.position.copy(f.at);
      f.sprite.position.y += t * 0.05;
      f.sprite.scale.setScalar(f.size * (0.35 + 0.65 * Math.sqrt(t)));
      f.sprite.material.opacity = 0.55 * (1 - t) * (1 - t);
    }
  }

  clear(): void {
    for (const f of this.puffs.values()) f.sprite.visible = false;
  }

  dispose(): void {
    for (const f of this.puffs.values()) f.sprite.material.dispose();
    this.texture.dispose();
  }
}
