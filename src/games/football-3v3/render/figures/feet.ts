import * as THREE from "three";
import { FootLock, type FootMode } from "../anim/foot-lock";
import { dutyFactor } from "../anim/gait";
import { solveLeg } from "../anim/leg-ik";
import type { Rig } from "../models/body";

const hip = new THREE.Vector3();
const reach = new THREE.Vector3();
const inverse = new THREE.Quaternion();
const shin = new THREE.Quaternion();
const fwd = new THREE.Vector3();
const down = new THREE.Vector3();
const fk = [new THREE.Vector3(), new THREE.Vector3()] as const;
/** The most a heel lifts off the turf, and the most the hips sink for a held foot, in metres. */
const HEEL = 0.11;
const SINK = 0.05;
/** Ankle to the ball of the foot, which stays down as the heel lifts. */
const FOOT = 0.15;

/**
 * Bends the legs so planted feet stay where they landed. After the pose
 * is applied and the body stood on the turf, each foot the lock holds is
 * reached for by its leg, blended in by the lock's weight, with the foot
 * laid flat on the grass. As the body moves on past a held foot its heel
 * lifts and the foot rolls onto its toes; a little further the hips sink;
 * further than that the foot lets go and swings through.
 */
export class Feet {
  readonly lock = new FootLock();

  update(rig: Rig, mode: FootMode, phase: number, speed: number, dt: number): void {
    rig.ankleL.getWorldPosition(fk[0]);
    rig.ankleR.getWorldPosition(fk[1]);
    const d = rig.dims;
    this.lock.update({ mode, phase, duty: dutyFactor(speed), speed, fk, ankle: d.ankleY, yaw: rig.root.rotation.y }, dt);
    const [l, r] = this.lock.feet;
    if (l.weight === 0 && r.weight === 0) return;
    // A foot left far behind rolls up onto its toes; past that the hips sink a little; past that it lifts.
    let sink = 0;
    for (let i = 0; i < 2; i++) {
      const foot = this.lock.feet[i]!;
      this.heel[i] = 0;
      if (foot.weight === 0) continue;
      const short = this.solve(rig, i, false).short;
      this.heel[i] = Math.min(HEEL, short * 1.3);
      const rest = Math.max(0, short - this.heel[i]! / 1.3);
      if (rest > SINK + 0.03) this.lock.release(i);
      else sink = Math.max(sink, Math.min(SINK, rest) * foot.weight);
    }
    if (sink > 0) {
      rig.body.position.y -= sink;
      rig.root.updateMatrixWorld(true);
    }
    for (let i = 0; i < 2; i++) if (this.lock.feet[i]!.weight > 0) this.solve(rig, i, true);
    rig.root.updateMatrixWorld(true);
  }

  /** How far each held heel is lifted this frame, rolling the foot onto its toes. */
  private readonly heel = [0, 0];

  /** Reaches leg `i` for its held foot; with `apply`, blends the bend into the bones and lays the foot flat. */
  private solve(rig: Rig, i: number, apply: boolean) {
    const foot = this.lock.feet[i]!;
    const [hipBone, knee, ankle] = i === 0 ? [rig.hipL, rig.kneeL, rig.ankleL] : [rig.hipR, rig.kneeR, rig.ankleR];
    hipBone.getWorldPosition(hip);
    rig.hips.getWorldQuaternion(inverse).invert();
    reach.set(foot.at.x - hip.x, foot.at.y + this.heel[i]! - hip.y, foot.at.z - hip.z).applyQuaternion(inverse);
    const s = solveLeg(reach.x, reach.y, reach.z, rig.dims.thigh, rig.dims.shin);
    if (!apply) return s;
    const w = foot.weight;
    const turn = (from: number, to: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * w;
    hipBone.rotation.set(turn(hipBone.rotation.x, s.hx), 0, turn(hipBone.rotation.z, s.hz));
    knee.rotation.x += (s.knee - knee.rotation.x) * w;
    hipBone.updateMatrixWorld(true);
    // The foot lies flat: turn the ankle against however the shin leans.
    knee.getWorldQuaternion(shin);
    fwd.set(0, 0, 1).applyQuaternion(shin);
    down.set(0, -1, 0).applyQuaternion(shin);
    // Flat on the turf, or tipped onto the toes as far as the heel has lifted.
    const flat = Math.atan(-fwd.y / Math.min(-1e-3, down.y)) + Math.asin(Math.min(1, this.heel[i]! / FOOT));
    ankle.rotation.x += (flat - ankle.rotation.x) * w;
    return s;
  }
}
