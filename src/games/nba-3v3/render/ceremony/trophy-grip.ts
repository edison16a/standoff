import * as THREE from "three";
import { createBasketballTrophy, disposeTree } from "@/games/kit/victory";

/** Bigger than life, so the trophy reads from a camera across the floor: about 90 centimetres tall. */
const SCALE = 1.45;
/**
 * How far up its own height the hands hold it. Cradled, high on the
 * column so it sits low and his face shows over it; raised, lower down,
 * so it stands tall above his hands.
 */
const GRIP_CRADLE = 0.5;
const GRIP_RAISED = 0.28;
/** The arena is lit for basketball, not for gold, so the trophy reflects its surroundings harder. */
const SHINE = 2.6;

/**
 * The championship trophy from the victory kit, held in the captain's
 * two hands. Each frame it stands upright between them, gripped round
 * the column, and turns with the line of his hands, so it rises with the
 * real lift instead of floating.
 */
export class TrophyGrip {
  readonly object = new THREE.Group();
  private readonly trophy: THREE.Group;
  private readonly mid = new THREE.Vector3();

  constructor() {
    this.trophy = createBasketballTrophy({ metal: "gold" });
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

  /** `lift` is 0 while he cradles it and 1 once it is right up. */
  hold(left: THREE.Vector3, right: THREE.Vector3, t: number, lift: number): void {
    this.mid.copy(left).add(right).multiplyScalar(0.5);
    const grip = GRIP_CRADLE + (GRIP_RAISED - GRIP_CRADLE) * lift;
    this.object.position.set(this.mid.x, this.mid.y - this.height * grip, this.mid.z);
    // Square to the line between the hands, with a slow sway so the gold catches the light.
    const across = Math.atan2(right.z - left.z, right.x - left.x);
    this.object.rotation.set(0, -across + Math.sin(t * 0.8) * 0.25, 0);
  }

  dispose(): void {
    disposeTree(this.trophy);
  }
}
