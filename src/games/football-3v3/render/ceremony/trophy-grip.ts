import * as THREE from "three";
import { disposeTree } from "@/games/kit/victory";
import { createFootballTrophy } from "./trophy";

/** Bigger than life, so the trophy reads from a camera across the field. */
const SCALE = 1.65;
/** How far up its own height the hands hold it: round the neck of the stand, above the foot. */
const GRIP = 0.3;
/** The night game's lights are dim for silver, so it reflects its surroundings harder. */
const SHINE = 2.6;

/**
 * The trophy in the captain's two hands. Each frame it stands upright
 * between them, gripped round the stand, and turns to face the way the
 * hands face, so it rises with the real lift rather than floating.
 */
export class TrophyGrip {
  readonly object = new THREE.Group();
  private readonly trophy: THREE.Group;
  private readonly mid = new THREE.Vector3();

  constructor() {
    this.trophy = createFootballTrophy();
    this.trophy.scale.setScalar(SCALE);
    this.trophy.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      const material = o.material as THREE.MeshStandardMaterial;
      if ("envMapIntensity" in material) material.envMapIntensity *= SHINE;
    });
    this.object.add(this.trophy);
    this.object.visible = false;
  }

  /** The trophy's height as held. */
  get height(): number {
    return (this.trophy.userData.height as number) * SCALE;
  }

  hold(left: THREE.Vector3, right: THREE.Vector3, t: number): void {
    this.mid.copy(left).add(right).multiplyScalar(0.5);
    this.object.position.set(this.mid.x, this.mid.y - this.height * GRIP, this.mid.z);
    // Square to the line between the hands, so the ball's laces face out past the captain; a slow sway shows it round.
    const across = Math.atan2(right.z - left.z, right.x - left.x);
    this.object.rotation.set(0, -across + Math.sin(t * 0.6) * 0.12, 0);
  }

  dispose(): void {
    disposeTree(this.trophy);
  }
}
