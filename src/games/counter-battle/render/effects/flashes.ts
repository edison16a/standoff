import * as THREE from "three";
import type { GunId } from "../../engine/guns";
import { flashTexture } from "../textures";

/** How big each gun's flash is, metres, and how long it lasts, seconds. */
const SIZE: Record<GunId, number> = { rifle: 0.45, smg: 0.34, shotgun: 0.75, sniper: 0.8 };
const LIFE = 0.06;
/** Turns the side flame from facing the barrel to lying along it. */
const ALONG = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));

interface Flash {
  gun: THREE.Object3D;
  sprite: THREE.Sprite;
  side: THREE.Mesh;
  born: number;
  size: number;
}

/**
 * Muzzle flashes: a bright star facing the viewer and a flame along the
 * barrel for the side view, both following the gun for the instant they
 * last. Pooled per fighter, one at a time each.
 */
export class Flashes {
  readonly group = new THREE.Group();
  private readonly texture = flashTexture();
  private readonly spriteMat = new THREE.SpriteMaterial({ map: this.texture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  private readonly sideMat = new THREE.MeshBasicMaterial({ map: this.texture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide });
  private readonly plane = new THREE.PlaneGeometry(1, 1);
  private readonly flashes = new Map<number, Flash>();

  /** A flash at `muzzle` (an object on the gun, so the flash rides the recoil). */
  fire(id: number, muzzle: THREE.Object3D, gun: GunId, now: number, spin: number): void {
    let f = this.flashes.get(id);
    if (!f) {
      const sprite = new THREE.Sprite(this.spriteMat.clone());
      const side = new THREE.Mesh(this.plane, this.sideMat);
      sprite.renderOrder = 7;
      side.renderOrder = 7;
      f = { gun: muzzle, sprite, side, born: now, size: SIZE[gun] };
      this.flashes.set(id, f);
      this.group.add(sprite, side);
    }
    f.gun = muzzle;
    f.born = now;
    f.size = SIZE[gun] * (0.85 + 0.3 * spin);
    f.sprite.material.rotation = spin * Math.PI * 2;
  }

  update(now: number): void {
    for (const f of this.flashes.values()) {
      const t = (now - f.born) / LIFE;
      const on = t >= 0 && t < 1;
      f.sprite.visible = on;
      f.side.visible = on;
      if (!on) continue;
      const k = 1 - t * 0.5;
      f.gun.updateWorldMatrix(true, false);
      f.gun.getWorldPosition(f.sprite.position);
      f.sprite.scale.setScalar(f.size * k);
      // The side flame lies along the barrel, just ahead of the muzzle.
      f.gun.getWorldQuaternion(f.side.quaternion);
      f.side.quaternion.multiply(ALONG);
      f.side.position.copy(f.sprite.position);
      f.side.translateX(-f.size * 0.45 * k);
      f.side.scale.set(f.size * 1.3 * k, f.size * 0.55 * k, 1);
    }
  }

  clear(): void {
    for (const f of this.flashes.values()) {
      f.sprite.visible = false;
      f.side.visible = false;
    }
  }

  dispose(): void {
    for (const f of this.flashes.values()) f.sprite.material.dispose();
    this.texture.dispose();
    this.spriteMat.dispose();
    this.sideMat.dispose();
    this.plane.dispose();
  }
}
