import * as THREE from "three";
import { wordsTexture } from "./textures";

/**
 * Words floating in the level, like the original's attempt counter at
 * the start. Each player has their own, shown only in their own view.
 */
export class Signs {
  readonly group = new THREE.Group();
  private readonly signs: { sprite: THREE.Sprite; attempt: number }[] = [];

  setAttempt(player: number, attempt: number): void {
    let sign = this.signs[player];
    if (!sign) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      sprite.position.set(9, 5.2, -1);
      sprite.scale.set(9, 9 * (192 / 1024), 1);
      this.group.add(sprite);
      sign = { sprite, attempt: -1 };
      this.signs[player] = sign;
    }
    if (sign.attempt === attempt) return;
    sign.attempt = attempt;
    sign.sprite.material.map?.dispose();
    sign.sprite.material.map = wordsTexture(`Attempt ${attempt}`);
    sign.sprite.material.needsUpdate = true;
  }

  show(player: number): void {
    this.signs.forEach((sign, i) => (sign.sprite.visible = i === player));
  }

  dispose(): void {
    for (const { sprite } of this.signs) {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
  }
}
