import * as THREE from "three";
import type { ZombieState } from "../../../engine/zombie";
import { BONES, type Rig } from "./rig";

/** How long a change of state takes to settle into the new pose, in seconds. */
const BLEND_S: Record<ZombieState, number> = { walk: 0.3, attack: 0.2, stagger: 0.08, dead: 0.12 };

const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Cross fades a zombie's pose when its state changes. Each state poses
 * the joints from scratch, so without this a walker that reaches the team
 * or gets shot would jump to the new pose in one frame. On a change it
 * keeps the pose last drawn and eases from it onto the new one.
 */
export class PoseBlend {
  private readonly from: THREE.Quaternion[] = BONES.map(() => new THREE.Quaternion());
  private readonly bodyFrom = new THREE.Quaternion();
  private readonly bodyAt = new THREE.Vector3();
  private readonly hipsAt = new THREE.Vector3();
  private state: ZombieState | null = null;
  private left = 0;
  private span = 1;

  /** Call before posing. Takes a copy of the pose still on the joints if the state just changed. */
  before(rig: Rig, state: ZombieState): void {
    if (this.state !== null && state !== this.state) {
      BONES.forEach((bone, i) => this.from[i]!.copy(rig.bones[bone].quaternion));
      this.bodyFrom.copy(rig.body.quaternion);
      this.bodyAt.copy(rig.body.position);
      this.hipsAt.copy(rig.bones.hips.position);
      this.span = this.left = BLEND_S[state];
    }
    this.state = state;
  }

  /** Call after posing. Mixes the copy back in, less each frame, until the new pose stands alone. */
  after(rig: Rig, dt: number): void {
    if (this.left <= 0) return;
    this.left = Math.max(0, this.left - dt);
    // The weight still on the old pose.
    const keep = ease(this.left / this.span);
    BONES.forEach((bone, i) => rig.bones[bone].quaternion.slerp(this.from[i]!, keep));
    rig.body.quaternion.slerp(this.bodyFrom, keep);
    rig.body.position.lerp(this.bodyAt, keep);
    rig.bones.hips.position.lerp(this.hipsAt, keep);
  }
}
