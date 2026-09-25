import * as THREE from "three";
import type { FootPlan } from "../anim/frame";
import type { Build, Foot } from "../anim/leg-ik";

/**
 * Pins planted feet to the turf. A foot asked to plant stays on the
 * spot where it was, in the world, while the body moves over it. If the
 * body gets too far away the foot lets go, and a released foot eases
 * to where the move wants it instead of jumping there.
 */
export class FootLock {
  private locked: THREE.Vector3 | null = null;
  private readonly last = new THREE.Vector3();
  private hasLast = false;
  /** Where a foot let go, on the turf, and how far it has eased away since. */
  private readonly from = new THREE.Vector3();
  private blend = 1;
  private readonly v = new THREE.Vector3();

  /** Turns a plan into a spot for the ankle, in the figure's frame. `root` is the figure's placed root. */
  resolve(plan: FootPlan, root: THREE.Object3D, b: Build, dt: number): Foot | null {
    if (plan?.plant) {
      if (!this.locked && this.hasLast && this.blend >= 1) this.locked = this.last.clone();
      if (this.locked) {
        const local = root.worldToLocal(this.v.copy(this.locked));
        // Settle onto the turf if it was planted from the air.
        local.y += (b.ground - local.y) * Math.min(1, dt * 25);
        const spot = { x: local.x, y: local.y, z: local.z, toe: 0 };
        this.locked.copy(root.localToWorld(this.v.copy(local)));
        if (Math.hypot(local.x, local.z) < 0.6 * b.s) return spot;
        // A step too far: let go and step again with the move.
        this.letGo();
      }
    } else if (this.locked) this.letGo();
    if (!plan) return null;
    if (this.blend >= 1) return plan;
    // Stepping from where the foot let go to where the move wants it: lifted, never dragged.
    this.blend = Math.min(1, this.blend + dt / 0.12);
    const k = this.blend * this.blend * (3 - 2 * this.blend);
    const f = root.worldToLocal(this.v.copy(this.from));
    // The body was moved a long way at once, for a kick off: no step, just stand where it is.
    if (Math.hypot(f.x, f.z) > 1.5) {
      this.blend = 1;
      return plan;
    }
    const lift = Math.min(0.12 * b.s, Math.hypot(plan.x - f.x, plan.z - f.z) * 0.4) * 4 * k * (1 - k);
    return { x: f.x + (plan.x - f.x) * k, y: f.y + (plan.y - f.y) * k + lift, z: f.z + (plan.z - f.z) * k, toe: plan.toe * k };
  }

  /** Records where the ankle ended up this frame, for the next plant. */
  remember(ankle: THREE.Object3D): void {
    ankle.getWorldPosition(this.last);
    this.hasLast = true;
  }

  private letGo(): void {
    if (this.locked) this.from.copy(this.locked);
    this.locked = null;
    this.blend = 0;
  }
}
