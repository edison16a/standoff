import * as THREE from "three";
import type { Athlete, TeamId } from "../engine/types";
import { CHARACTERS, TEAMS } from "../roster";
import { blockPose, landPose, layupPose, passPose, shootPose, stealPose, stumblePose } from "./anim/actions";
import { celebratePose, dejectedPose } from "./anim/celebrations";
import { dunkPose, dunkSpin } from "./anim/dunks";
import { CHEST_HOLD, RECEIVE } from "./anim/holding";
import { locomotion, strideLength } from "./anim/locomotion";
import { applyPose, approach, blend, STAND, type Pose } from "./anim/pose";
import { buildAthlete, type AthleteModel } from "./models/athlete-model";

export interface AthleteScene {
  /** Holding the ball right now. */
  holding: boolean;
  /** Holding it in both hands at the chest, as the ball is checked, rather than dribbling. */
  chest: boolean;
  /** 0 to 1 as a ball thrown to this player comes in, for reaching out to catch it. */
  receiving: number;
  /** Down in a stance, guarding the player with the ball. */
  guarding: boolean;
  /** Set once the game is won: winners celebrate, losers hang their heads. */
  winner: TeamId | null;
}

const v = new THREE.Vector3();
/** After a shot, a dunk or a pass the body eases back into its run this slowly at first. */
const RECOVER = 0.4;
/** A jump in position bigger than this in one frame is a reset, eased out rather than shown. */
const TELEPORT = 0.6;

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
  private readonly slip = new THREE.Vector3();
  private readonly last = new THREE.Vector3();
  private readonly seed: number;

  constructor(readonly athlete: Athlete, bodyMat: THREE.Material, parent: THREE.Object3D) {
    this.model = buildAthlete(CHARACTERS[athlete.character], TEAMS[athlete.team], bodyMat);
    this.seed = athlete.id * 1.7;
    this.last.set(athlete.x, athlete.y, athlete.z);
    parent.add(this.model.joints.root);
  }

  update(a: Athlete, s: AthleteScene, dt: number): void {
    this.time += dt;
    const c = CHARACTERS[a.character];
    this.place(a, dt);
    const speed = Math.hypot(a.vx, a.vz);
    const leg = this.model.dims.thigh + this.model.dims.shin;
    this.phase = (this.phase + (speed * dt) / strideLength(speed, leg, s.guarding)) % 1;
    const rx = -Math.cos(a.yaw);
    const rz = Math.sin(a.yaw);
    const lateral = speed > 0.2 ? (a.vx * rx + a.vz * rz) / speed : 0;
    const dribbling = s.holding && !s.chest && a.action.kind === "none";
    let base = locomotion({ speed, phase: this.phase, lateral, guarding: s.guarding, dribble: dribbling ? a.dribble : null, dribbleSide: a.dribbleSide, time: this.time, seed: this.seed });
    if (s.holding && s.chest) base = blend(base, CHEST_HOLD, 1, base);
    else if (s.receiving > 0) base = blend(base, RECEIVE, ease(s.receiving), base);

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
        target = shootPose(act.t, this.releasedAt, base);
        rate = 34;
        break;
      case "drive": {
        const timing = { takeoff: act.takeoff, finish: act.finish, land: act.land };
        target = act.dunk ? dunkPose(c.dunk, act.t, timing, base) : layupPose(act.t, timing, base);
        target.spin = act.dunk ? dunkSpin(c.dunk, act.t, timing) : 0;
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
    this.model.joints.root.rotation.y = a.yaw + this.pose.spin;
    this.model.joints.root.updateMatrixWorld(true);
  }

  /** Follows the engine's position, easing out any sudden jump so a reset never pops. */
  private place(a: Athlete, dt: number): void {
    v.set(a.x, a.y, a.z);
    if (v.distanceTo(this.last) > TELEPORT) this.slip.add(this.last).sub(v);
    this.last.copy(v);
    this.slip.multiplyScalar(Math.exp(-dt * 7));
    this.model.joints.root.position.copy(v).add(this.slip);
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
