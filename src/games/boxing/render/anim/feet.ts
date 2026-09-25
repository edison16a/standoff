import * as THREE from "three";
import type { Hand } from "../../engine/types";

/** Where each foot sits in an orthodox stance, from the boxer's middle: left foot forward. */
export const STANCE_FEET: Record<Hand, { x: number; z: number; yaw: number }> = {
  left: { x: 0.14, z: 0.2, yaw: 0.35 },
  right: { x: -0.16, z: -0.2, yaw: 0.65 },
};

const STEP_AT = 0.11;
const STEP_S = 0.16;
const LIFT = 0.055;

interface Foot {
  planted: THREE.Vector3;
  from: THREE.Vector3;
  to: THREE.Vector3;
  /** Seconds into a step, or null while planted. */
  stepping: number | null;
  now: THREE.Vector3;
}

/**
 * Feet that stay planted on the canvas while the body moves over them,
 * then step, one at a time, when the body has moved on. That keeps the
 * boxers from sliding as they circle, and makes the footwork read.
 */
export class FootPlanner {
  private readonly feet: Record<Hand, Foot>;
  private primed = false;

  constructor() {
    const foot = (): Foot => ({ planted: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), stepping: null, now: new THREE.Vector3() });
    this.feet = { left: foot(), right: foot() };
  }

  /** Where a foot wants to be for a body at (x, z) facing `yaw`, in world space. */
  static home(hand: Hand, x: number, z: number, yaw: number, scale: number, out: THREE.Vector3): THREE.Vector3 {
    const f = STANCE_FEET[hand];
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return out.set(x + (f.x * c + f.z * s) * scale, 0, z + (-f.x * s + f.z * c) * scale);
  }

  /** Moves the feet on, and returns each foot's world position with the lift of a step. */
  update(x: number, z: number, yaw: number, scale: number, dt: number): Record<Hand, THREE.Vector3> {
    const want = { left: new THREE.Vector3(), right: new THREE.Vector3() };
    FootPlanner.home("left", x, z, yaw, scale, want.left);
    FootPlanner.home("right", x, z, yaw, scale, want.right);
    if (!this.primed) {
      this.primed = true;
      for (const hand of ["left", "right"] as const) this.feet[hand].planted.copy(want[hand]);
    }
    const busy = this.feet.left.stepping !== null || this.feet.right.stepping !== null;
    // The foot further from where it should be steps first.
    const order: Hand[] = this.feet.left.planted.distanceTo(want.left) >= this.feet.right.planted.distanceTo(want.right) ? ["left", "right"] : ["right", "left"];
    let started = busy;
    for (const hand of order) {
      const foot = this.feet[hand];
      if (foot.stepping === null && !started && foot.planted.distanceTo(want[hand]) > STEP_AT * scale) {
        foot.stepping = 0;
        foot.from.copy(foot.planted);
        started = true;
      }
      if (foot.stepping !== null) {
        // Aim a little past where it is needed, so a steady circle needs fewer steps.
        foot.to.copy(want[hand]).lerp(foot.from, -0.3);
        foot.stepping += dt;
        const t = Math.min(1, foot.stepping / STEP_S);
        const ease = t * t * (3 - 2 * t);
        foot.now.copy(foot.from).lerp(foot.to, ease);
        foot.now.y = Math.sin(Math.PI * t) * LIFT * scale;
        if (t >= 1) {
          foot.planted.copy(foot.to);
          foot.stepping = null;
        }
      } else {
        foot.now.copy(foot.planted);
      }
    }
    return { left: this.feet.left.now, right: this.feet.right.now };
  }

  /** Puts the feet straight down under the body, as after a knockdown or a replay. */
  reset(): void {
    this.primed = false;
    this.feet.left.stepping = this.feet.right.stepping = null;
  }
}
