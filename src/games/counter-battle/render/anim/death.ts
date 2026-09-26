import * as THREE from "three";
import type { Rig } from "../models/rig";
import { bump, smooth } from "./curves";

/** Joints the fall turns, in the order their turns are remembered. */
const JOINTS = ["pelvis", "spine", "chest", "neck", "head", "shoulderL", "elbowL", "handL", "shoulderR", "elbowR", "handR", "hipL", "kneeL", "ankleL", "hipR", "kneeR", "ankleR"] as const;
type JointName = (typeof JOINTS)[number];

const e = new THREE.Euler();
const q = new THREE.Quaternion();

/**
 * A fighter going down: the knees give, the body folds and tips over,
 * lands with a small bounce and lies still, arms thrown out. It starts
 * from whatever pose the fighter was in and blends out of it, so a
 * sniper shot mid peek and a spray at a kneeling fighter both look right.
 */
export class Fall {
  private readonly from = new Map<JointName, THREE.Quaternion>();
  private fromHip = new THREE.Vector3();
  /** +1 falls forward onto the face, -1 backward. */
  private dir = -1;
  /** Which way the body rolls as it goes, -1 or 1. */
  private roll = 1;

  /** Remembers the live pose at the moment of death and which way the shot pushed. */
  start(rig: Rig, pushLocal: { x: number; z: number }, seed: number): void {
    for (const name of JOINTS) this.from.set(name, rig[name].quaternion.clone());
    this.fromHip.copy(rig.pelvis.position);
    this.dir = pushLocal.z >= 0 ? 1 : -1;
    this.roll = pushLocal.x >= 0 ? 1 : -1;
    if (Math.abs(pushLocal.x) < 0.2) this.roll = seed % 2 ? 1 : -1;
  }

  get started(): boolean {
    return this.from.size > 0;
  }

  reset(rig: Rig): void {
    this.from.clear();
    rig.tilt.rotation.set(0, 0, 0);
    rig.tilt.position.set(0, 0, 0);
  }

  pose(rig: Rig, t: number): void {
    const s = rig.size.s;
    const buckle = smooth(t / 0.22);
    // Tipping over speeds up like a real fall, then a small bounce as the body lands.
    const f = Math.min(1, Math.max(0, (t - 0.08) / 0.62));
    const fall = f * f;
    const land = bump((t - 0.7) / 0.25) * 0.08;
    const angle = this.dir * (1.42 * fall - land);
    rig.tilt.rotation.set(angle, 0, this.roll * 0.25 * fall, "XZY");
    // Lift the pivot as the body goes flat, so the back or chest rests on the turf instead of in it.
    rig.tilt.position.set(0, 0.13 * s * fall, 0);
    const blend = smooth(t / 0.3);
    const d = this.dir;
    const r = this.roll;
    const target: Record<JointName, [number, number, number]> = {
      pelvis: [0, 0, 0],
      spine: [d * 0.15 * buckle, 0, 0],
      chest: [d > 0 ? 0.1 : -0.25 * fall, r * 0.2, 0],
      neck: [d > 0 ? -0.3 : 0.2, r * 0.5 * fall, 0],
      head: [0, r * 0.4 * fall, r * 0.2],
      shoulderL: [-0.4 - 0.8 * fall, 0, 0.5 + 0.9 * fall],
      elbowL: [-0.5, 0, 0],
      handL: [0.2, 0, 0],
      shoulderR: [-0.3 - 0.6 * fall, 0, -0.4 - 1.1 * fall],
      elbowR: [-0.7, 0, 0],
      handR: [0.3, 0, 0],
      hipL: [-0.5 * buckle - 0.2 * fall * r, 0, 0.1],
      kneeL: [0.9 * buckle - 0.3 * fall, 0, 0],
      ankleL: [0.3, 0, 0],
      hipR: [-0.3 * buckle + 0.2 * fall * r, 0, -0.12],
      kneeR: [0.5 * buckle + 0.4 * fall * r, 0, 0],
      ankleR: [0.4, 0, 0],
    };
    for (const name of JOINTS) {
      const [x, y, z] = target[name];
      q.setFromEuler(e.set(x, y, z, "XZY"));
      const from = this.from.get(name);
      if (from) rig[name].quaternion.copy(from).slerp(q, blend);
      else rig[name].quaternion.copy(q);
    }
    // The hips sink as the knees give, then the tilt carries the body down.
    rig.pelvis.position.set(this.fromHip.x * (1 - blend), this.fromHip.y + (0.94 * s - this.fromHip.y) * blend - 0.18 * s * buckle * (1 - fall), this.fromHip.z * (1 - blend));
    rig.root.updateMatrixWorld(true);
  }
}
