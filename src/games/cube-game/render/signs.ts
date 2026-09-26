import * as THREE from "three";
import { wordsTexture } from "./textures";

interface Sign {
  sprite: THREE.Sprite;
  attempt: number;
  diamonds: THREE.Mesh[];
}

const DIAMOND = 0x3dff6e;

/**
 * Words and markers floating in the level, shown only in their own
 * player's view: the attempt counter at the start, like the original,
 * and a green diamond at each practice checkpoint.
 */
export class Signs {
  readonly group = new THREE.Group();
  private readonly signs: Sign[] = [];
  private readonly diamond = new THREE.OctahedronGeometry(0.32, 0);
  private readonly diamondMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(DIAMOND).multiplyScalar(2) });

  private sign(player: number): Sign {
    let sign = this.signs[player];
    if (!sign) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      sprite.position.set(9, 5.2, -1);
      sprite.scale.set(9, 9 * (192 / 1024), 1);
      this.group.add(sprite);
      sign = { sprite, attempt: -1, diamonds: [] };
      this.signs[player] = sign;
    }
    return sign;
  }

  /** Zero shows no counter, as for the computer's run behind the menu, where it peeked out from behind the title. */
  setAttempt(player: number, attempt: number): void {
    const sign = this.sign(player);
    if (sign.attempt === attempt) return;
    sign.attempt = attempt;
    if (attempt <= 0) return;
    sign.sprite.material.map?.dispose();
    sign.sprite.material.map = wordsTexture(`Attempt ${attempt}`);
    sign.sprite.material.needsUpdate = true;
  }

  setCheckpoints(player: number, spots: readonly { x: number; y: number }[]): void {
    const { diamonds } = this.sign(player);
    while (diamonds.length < spots.length) {
      const mesh = new THREE.Mesh(this.diamond, this.diamondMaterial);
      mesh.scale.set(1, 1.5, 1);
      this.group.add(mesh);
      diamonds.push(mesh);
    }
    diamonds.forEach((mesh, i) => {
      const spot = spots[i];
      mesh.userData.used = !!spot;
      if (spot) mesh.position.set(spot.x, spot.y + 0.1, 0.2);
    });
  }

  show(player: number, time: number): void {
    this.signs.forEach((sign, i) => {
      sign.sprite.visible = i === player && sign.attempt > 0;
      for (const mesh of sign.diamonds) {
        mesh.visible = i === player && mesh.userData.used === true;
        mesh.rotation.y = time * 2;
      }
    });
  }

  dispose(): void {
    for (const { sprite } of this.signs) {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this.diamond.dispose();
    this.diamondMaterial.dispose();
  }
}
