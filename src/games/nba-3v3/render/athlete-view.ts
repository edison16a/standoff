import * as THREE from "three";
import type { Athlete } from "../engine/types";
import { CHARACTERS, TEAMS } from "../roster";
import { blockPose, landPose, layupPose, passPose, shootPose, stealPose, stumblePose } from "./anim/actions";
import { celebratePose, dejectedPose } from "./anim/celebrations";
import { dunkPose, dunkSpin } from "./anim/dunks";
import { basePose, type AthleteScene } from "./anim/base";
import { setShotPose } from "./anim/line";
import { strideLength } from "./anim/locomotion";
import { movePose } from "./anim/moves";
import { applyPose, approach, blend, STAND, type Pose } from "./anim/pose";
import { buildAthlete, type AthleteModel } from "./models/athlete-model";
import { Placement } from "./placement";

export type { AthleteScene };

const v = new THREE.Vector3();
/** After a shot, a dunk or a pass the body eases back into its run this slowly at first. */
const RECOVER = 0.4;

const ease = (u: number) => {
  const k = Math.min(1, Math.max(0, u));
  return k * k * (3 - 2 * k);
};

/**
 * One player on screen: the model, and the animation that follows the
 * engine's state. Running, dribbling and guarding blend underneath;
 * shots, dunks, passes, blocks and steals play on top, timed from the
 * engine's own action clock so the ball and the body agree. Every change
 * of state eases into the next, and the stride is matched to the ground
 * speed so the feet stay planted.
 */
export class AthleteView {
  readonly model: AthleteModel;
  private readonly pose: Pose = { ...STAND };
  private phase = 0;
  private time = 0;
  private lastY = 0;
  private landAt = -9;
  private hardLand = false;
  private releasedAt: number | null = null;
  private lastKind = "none";
  private endedAt = -9;
  private readonly placement: Placement;
  private readonly seed: number;
  private readonly lastV = new THREE.Vector2();
  private ahead = 0;
  private side = 0;

  constructor(readonly athlete: Athlete, bodyMat: THREE.Material, parent: THREE.Object3D) {
    this.model = buildAthlete(CHARACTERS[athlete.character], TEAMS[athlete.team], bodyMat);
    this.seed = athlete.id * 1.7;
    this.placement = new Placement(athlete);
    parent.add(this.model.joints.root);
  }

  update(a: Athlete, s: AthleteScene, dt: number): void {
    this.time += dt;
    const c = CHARACTERS[a.character];
    const speed = Math.hypot(a.vx, a.vz);
    this.stride(a, s, speed, dt);
    this.feelMomentum(a, dt);
    const base = basePose(a, s, { speed, phase: this.phase, ahead: this.ahead, side: this.side, time: this.time, seed: this.seed });

    const act = a.action;
    const wasDrive = this.lastKind === "drive";
    if (act.kind !== this.lastKind) {
      // A spin in the air ends facing the same way it started, so unwind it without turning back round.
      if (wasDrive) this.pose.spin = Math.atan2(Math.sin(this.pose.spin), Math.cos(this.pose.spin));
      if (act.kind === "none") this.endedAt = this.time;
      this.releasedAt = null;
      this.lastKind = act.kind;
    }
    if (this.lastY > 0.05 && a.y <= 0.001) {
      this.landAt = this.time;
      this.hardLand = act.kind === "drive" || wasDrive;
    }
    this.lastY = a.y;

    let target: Pose = base;
    let rate = 16;
    switch (act.kind) {
      case "shoot":
        if (act.released && this.releasedAt === null) this.releasedAt = act.t;
        target = act.free ? setShotPose(act.t, this.releasedAt, base) : shootPose(act.t, this.releasedAt, base);
        rate = 34;
        break;
      case "drive": {
        const timing = { takeoff: act.takeoff, finish: act.finish, land: act.land, rimHang: act.rimHang };
        const style = act.style ?? c.dunk;
        target = act.dunk ? dunkPose(style, act.t, timing, base) : layupPose(act.t, timing, base);
        target.spin = act.dunk ? dunkSpin(style, act.t, timing) : 0;
        rate = 30;
        break;
      }
      case "pass":
        target = passPose(act.t, base);
        rate = 30;
        break;
      case "block":
        target = blockPose(act.t, act.gather, act.air, base);
        rate = 30;
        break;
      case "steal":
        target = stealPose(act.t, base);
        rate = 30;
        break;
      case "move":
        target = movePose(act, base);
        rate = 26;
        break;
      case "stumble":
        target = stumblePose(act.t, act.dur, base);
        rate = 22;
        break;
      case "celebrate":
        // Into the celebration and out of it again smoothly, back to the walk to the check.
        target = s.holding ? base : blend(base, celebratePose(c.celebration, act.t), ease(act.t / 0.25) * ease((act.dur - act.t) / 0.3), { ...base });
        break;
      case "none": {
        if (s.winner !== null) target = s.winner === a.team ? celebratePose(c.celebration, this.time) : dejectedPose(this.time);
        else if (this.time - this.landAt < 0.4) target = landPose(this.time - this.landAt, this.hardLand, base);
        // Coming out of an action the limbs settle gently instead of snapping back to the run.
        rate = 7 + 9 * ease((this.time - this.endedAt) / RECOVER);
        break;
      }
    }
    approach(this.pose, target, rate, dt);
    applyPose(this.pose, this.model.joints, this.model.dims);
    this.placement.place(a, this.model.joints.root, this.pose.spin, dt);
    this.placement.plant(a, this.model, { L: this.pose.footL, R: this.pose.footR }, dt);
    this.model.joints.root.updateMatrixWorld(true);
  }

  /**
   * Moves the legs through their stride by the ground covered, so the
   * feet stay planted. On the run with the ball the stride is also
   * drawn gently into step with the dribble, the ball hitting the floor
   * as the foot opposite the ball hand lands; the engine already bounces
   * it once a stride, so the pull is tiny and the feet do not skate.
   */
  private stride(a: Athlete, s: AthleteScene, speed: number, dt: number): void {
    const leg = this.model.dims.thigh + this.model.dims.shin;
    this.phase = (this.phase + (speed * dt) / strideLength(speed, leg, s.guarding)) % 1;
    if (!s.holding || s.chest || speed < 1.6 || (a.action.kind !== "none" && a.action.kind !== "move")) return;
    const want = a.dribble - 0.25 * a.dribbleHand;
    const err = want - this.phase - Math.round(want - this.phase);
    this.phase = (this.phase + Math.max(-0.15 * dt, Math.min(0.15 * dt, err)) + 1) % 1;
  }

  /** Smooths the change in velocity into the lean of a push off, a stop or a cut, in the player's own frame. */
  private feelMomentum(a: Athlete, dt: number): void {
    if (dt <= 0) return;
    const ax = (a.vx - this.lastV.x) / dt;
    const az = (a.vz - this.lastV.y) / dt;
    this.lastV.set(a.vx, a.vz);
    const k = 1 - Math.exp(-dt * 10);
    const ahead = ax * Math.sin(a.yaw) + az * Math.cos(a.yaw);
    const side = -ax * Math.cos(a.yaw) + az * Math.sin(a.yaw);
    // A jump or a teleport is not a push off.
    const ok = a.y < 0.01 && Math.hypot(ax, az) < 60;
    this.ahead += ((ok ? ahead : 0) - this.ahead) * k;
    this.side += ((ok ? side : 0) - this.side) * k;
  }

  /** Where a hand is in the world, for putting the ball in it. */
  hand(side: "L" | "R", out: THREE.Vector3): THREE.Vector3 {
    const hand = side === "L" ? this.model.joints.handL : this.model.joints.handR;
    return hand.localToWorld(out.set(0, -0.07, 0.03));
  }

  /** A point just above the head, where the name tag and the shot meter float. */
  tagPoint(out: THREE.Vector3): THREE.Vector3 {
    this.model.joints.neck.getWorldPosition(v);
    return out.set(v.x, v.y + 0.55, v.z);
  }

  dispose(parent: THREE.Object3D): void {
    parent.remove(this.model.joints.root);
    this.model.dispose();
  }
}
