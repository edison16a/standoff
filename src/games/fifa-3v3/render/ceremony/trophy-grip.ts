import * as THREE from "three";
import { createWorldCupTrophy, disposeTree } from "@/games/kit/victory";

/** Bigger than life, so the cup reads from a camera across the centre circle. */
const SCALE = 1.7;
/** How far up its own height the hands hold it: round the stone bands at the foot. */
const GRIP = 0.12;
/** The match's floodlit night is dim for gold, so the cup reflects its surroundings harder. */
const SHINE = 3;

/**
 * The World Cup style trophy from the victory kit, held in the captain's
 * two hands. Each frame it is stood upright between them, gripped round
 * the base, and turned to face the way the hands face, so it rises with
 * the real lift rather than floating.
 */
export class TrophyGrip {
  readonly object = new THREE.Group();
  private readonly cup: THREE.Group;
  private readonly mid = new THREE.Vector3();

  constructor() {
    this.cup = createWorldCupTrophy({ metal: "gold" });
    this.cup.scale.setScalar(SCALE);
    this.cup.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      const material = o.material as THREE.MeshStandardMaterial;
      if ("envMapIntensity" in material) material.envMapIntensity *= SHINE;
    });
    this.object.add(this.cup);
    this.object.visible = false;
  }

  /** The cup's height as held. */
  get height(): number {
    return (this.cup.userData.height as number) * SCALE;
  }

  hold(left: THREE.Vector3, right: THREE.Vector3, t: number): void {
    this.mid.copy(left).add(right).multiplyScalar(0.5);
    this.object.position.set(this.mid.x, this.mid.y - this.height * GRIP, this.mid.z);
    // Square to the line between the hands, so the two figures on it face out past the captain.
    const across = Math.atan2(right.z - left.z, right.x - left.x);
    this.object.rotation.set(0, -across + Math.sin(t * 0.6) * 0.1, 0);
  }

  dispose(): void {
    disposeTree(this.cup);
  }
}
