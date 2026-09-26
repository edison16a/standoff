import * as THREE from "three";
import type { Pose } from "../rig/pose";

function smooth(from: number, to: number, t: number): number {
  const k = Math.min(1, Math.max(0, (t - from) / (to - from)));
  return k * k * (3 - 2 * k);
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Lying on the back after the final hit: hips on the floor, legs out in front, arms flung wide. */
const DOWN = {
  hips: v(-0.62, 0.17, 0.04),
  footR: v(0.33, 0.09, 0.22),
  footL: v(0.16, 0.09, -0.2),
  hand: v(-0.55, 0.12, 0.58),
  offHand: v(-0.62, 0.12, -0.55),
};
/** Reeling back as the knees go, before the fall. */
const STUMBLE_HIPS = v(-0.2, 0.72, 0);
/** The dropped sword comes to rest flat on the floor beside the fallen fighter. */
const SWORD_REST = { grip: v(0.2, 0.03, 0.78), blade: v(0.85, 0, 0.5).normalize(), edge: v(-0.5, 0, 0.85).normalize() };
/** The sword leaves the hand this long after the final hit, and takes this long to land. */
const DROP_AT = 90;
const DROP_MS = 520;

/** The winner's sword held high, tip to the sky, and the free fist punching the air. */
const RAISED = { grip: v(0.1, 1.98, 0.28), blade: v(0.2, 1, -0.06).normalize(), edge: v(-1, 0.2, 0).normalize(), offHand: v(0.18, 1.72, -0.36) };

/**
 * The two endings. Knocked down, the fighter stumbles back, their knees
 * go and they fall flat, and the sword drops from their hand and clatters
 * to the floor. The winner raises the sword overhead and pumps the air.
 * Both are laid over the living pose, so they start from wherever the
 * fighter happened to be.
 */
export class Finale {
  private released: { grip: THREE.Vector3; rotation: THREE.Quaternion } | null = null;
  private readonly rest = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(SWORD_REST.blade, SWORD_REST.edge, SWORD_REST.blade.clone().cross(SWORD_REST.edge)),
  );
  private readonly q = new THREE.Quaternion();
  private readonly m = new THREE.Matrix4();
  private readonly side = new THREE.Vector3();

  reset(): void {
    this.released = null;
  }

  defeat(pose: Pose, ms: number): void {
    const stumble = smooth(0, 280, ms);
    const fall = smooth(220, 800, ms);
    // A little bounce as the body hits the floor.
    const bounce = ms > 800 ? 0.035 * Math.exp(-(ms - 800) / 140) * Math.abs(Math.sin((ms - 800) / 55)) : 0;
    pose.hips.lerp(STUMBLE_HIPS, stumble).lerp(DOWN.hips, fall);
    pose.hips.y += bounce;
    pose.lean = lerp(lerp(pose.lean, -0.35, stumble), -1.5, fall);
    pose.tilt = lerp(pose.tilt, 0.1, fall);
    pose.twist = lerp(pose.twist, 0.1, fall);
    pose.hipsYaw = lerp(pose.hipsYaw, 0.05, fall);
    pose.nod = lerp(pose.nod, -0.25, stumble);
    pose.turn = lerp(pose.turn, 0.35, fall);
    pose.footR.lerp(DOWN.footR, fall);
    pose.footL.lerp(DOWN.footL, fall);
    pose.toeR = lerp(pose.toeR, 0.25, fall);
    pose.toeL = lerp(pose.toeL, -0.2, fall);
    pose.offGrip = 0;
    pose.offHand.lerp(DOWN.offHand, fall);
    this.drop(pose, ms);
    pose.hand.lerp(DOWN.hand, smooth(DROP_AT, 800, ms));
  }

  victory(pose: Pose, ms: number): void {
    const up = smooth(0, 450, ms);
    const pump = ms > 450 ? Math.sin((ms - 450) / 170) : 0;
    pose.grip.lerp(RAISED.grip, up);
    pose.grip.y += 0.06 * pump * up;
    pose.blade.lerp(RAISED.blade, up).normalize();
    pose.edge.lerp(RAISED.edge, up);
    pose.hand.copy(pose.grip);
    pose.offGrip *= 1 - up;
    pose.offHand.lerp(RAISED.offHand, up);
    pose.offHand.y -= 0.06 * pump * up;
    pose.hips.y += 0.03 * Math.abs(Math.sin(ms / 200)) * up;
    pose.lean = lerp(pose.lean, -0.08, up);
    pose.nod = lerp(pose.nod, -0.25, up);
    pose.turn = lerp(pose.turn, 0, up);
  }

  /** The sword leaves the hand and falls, turning flat, to the floor. */
  private drop(pose: Pose, ms: number): void {
    if (ms < DROP_AT) return;
    if (!this.released) {
      this.side.crossVectors(pose.blade, pose.edge);
      this.m.makeBasis(pose.blade, pose.edge, this.side);
      this.released = { grip: pose.grip.clone(), rotation: new THREE.Quaternion().setFromRotationMatrix(this.m) };
    }
    const p = Math.min(1, (ms - DROP_AT) / DROP_MS);
    const { grip, rotation } = this.released;
    // Falling: level motion is steady, the drop speeds up like anything under gravity.
    pose.grip.set(lerp(grip.x, SWORD_REST.grip.x, p), lerp(grip.y, SWORD_REST.grip.y, p * p), lerp(grip.z, SWORD_REST.grip.z, p));
    pose.grip.y += p >= 1 ? 0.012 * Math.exp(-(ms - DROP_AT - DROP_MS) / 90) : 0;
    this.q.copy(rotation).slerp(this.rest, Math.min(1, p * 1.3));
    pose.blade.set(1, 0, 0).applyQuaternion(this.q);
    pose.edge.set(0, 1, 0).applyQuaternion(this.q);
    pose.holding = false;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
