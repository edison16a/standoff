import * as THREE from "three";
import type { Bone, Rig } from "../models/rig";
import { HEAD_Y } from "../models/runner-look";
import { SOLE_DROP } from "../models/runner-shoe";

/**
 * Points round the outside of the runner, each riding on a bone: the
 * corners of each sole, the knees, elbows and hands, the seat, the back,
 * and the cap's crown and peak. Their lowest one is where the body meets
 * the ground. A little inside the surface, so a glancing touch still counts.
 */
const PROBES: readonly (readonly [Bone, number, number, number])[] = [
  ...(["ankleL", "ankleR"] as const).flatMap((bone) => [
    [bone, -0.085, -SOLE_DROP, -0.24],
    [bone, 0.085, -SOLE_DROP, -0.24],
    [bone, -0.085, -SOLE_DROP, 0.12],
    [bone, 0.085, -SOLE_DROP, 0.12],
  ] as const),
  ["kneeL", 0, 0, -0.07],
  ["kneeR", 0, 0, -0.07],
  ["elbowL", 0, 0, 0.05],
  ["elbowR", 0, 0, 0.05],
  ["handL", 0, -0.09, 0],
  ["handR", 0, -0.09, 0],
  ["hips", 0, -0.1, 0.1],
  ["hips", 0, 0.04, 0.112],
  ["spine", 0, 0.08, 0.108],
  ["chest", 0, 0.0, 0.112],
  ["chest", 0, 0.2, 0.15],
  ["chest", 0, 0.27, 0.1],
  // Round the cap from the peak, over the crown to the strap, and the chin.
  ...[-1.6, -1, -0.5, 0, 0.5, 1, 1.5].map((a) => ["head", 0, HEAD_Y + 0.07 + 0.226 * Math.cos(a), 0.012 + 0.226 * Math.sin(a)] as const),
  ["head", 0, HEAD_Y + 0.13, -0.34],
  ["head", 0, HEAD_Y - 0.12, -0.16],
];

const point = new THREE.Vector3();
const base = new THREE.Vector3();

/**
 * Keeps the posed body out of the ground: after a pose is laid on, the
 * whole body is lifted just enough that nothing sinks below the floor.
 * Planted feet stay on it through a stride and a landing, a roll tumbles
 * over it like a ball, and a crash lies on it rather than half buried.
 */
export class GroundContact {
  private readonly probes: THREE.Object3D[] = [];

  constructor(private readonly rig: Rig) {
    for (const [bone, x, y, z] of PROBES) {
      const probe = new THREE.Object3D();
      probe.position.set(x, y, z);
      rig.bones[bone].add(probe);
      this.probes.push(probe);
    }
  }

  /** How far the lowest point sits above the runner's feet, in metres. Negative is in the ground. */
  lowest(): number {
    const root = this.rig.root;
    // One pass down the skeleton. Where the runner stands drops out, as both ends are measured in the world.
    root.updateMatrixWorld(true);
    base.setFromMatrixPosition(root.matrixWorld);
    let low = Infinity;
    for (const probe of this.probes) low = Math.min(low, point.setFromMatrixPosition(probe.matrixWorld).y - base.y);
    return low;
  }

  /**
   * Moves the body so its lowest point rests on `floor`, measured from the
   * runner's feet, and returns how far. With `settle` off it only ever lifts,
   * for hops and leaps that leave the ground. With it on, a body standing,
   * running or rolling is also brought down onto the floor, so no foot floats.
   */
  plant(floor = 0, settle = false): number {
    const shift = floor - this.lowest();
    if (shift <= 0 && !settle) return 0;
    this.rig.pivot.position.y += shift;
    return shift;
  }
}
