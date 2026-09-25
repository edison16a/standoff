import * as THREE from "three";
import type { Athlete, TeamId } from "../engine/types";
import { CHARACTERS, TEAMS } from "../roster";
import { blockPose, landPose, layupPose, passPose, shootPose, stealPose, stumblePose } from "./anim/actions";
import { celebratePose, dejectedPose } from "./anim/celebrations";
import { dunkPose, dunkSpin } from "./anim/dunks";
import { locomotion } from "./anim/locomotion";
import { applyPose, approach, STAND, type Pose } from "./anim/pose";
import { buildAthlete, type AthleteModel } from "./models/athlete-model";

export interface AthleteScene {
  /** Holding the ball right now. */
  holding: boolean;
  /** Down in a stance, guarding the player with the ball. */
  guarding: boolean;
  /** Set once the game is won: winners celebrate, losers hang their heads. */
  winner: TeamId | null;
}

const v = new THREE.Vector3();

/**
 * One player on screen: the model, and the animation that follows the
 * engine's state. Running, dribbling and guarding blend underneath;
 * shots, dunks, passes, blocks and steals play on top, timed from the
 * engine's own action clock so the ball and the body agree.
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
  private readonly seed: number;

  constructor(readonly athlete: Athlete, bodyMat: THREE.Material, parent: THREE.Object3D) {
    this.model = buildAthlete(CHARACTERS[athlete.character], TEAMS[athlete.team], bodyMat);
    this.seed = athlete.id * 1.7;
    parent.add(this.model.joints.root);
  }

  update(a: Athlete, s: AthleteScene, dt: number): void {
    this.time += dt;
    const c = CHARACTERS[a.character];
    const root = this.model.joints.root;
    root.position.set(a.x, a.y, a.z);
    const speed = Math.hypot(a.vx, a.vz);
    this.phase = (this.phase + (speed * dt) / (1.25 * c.build.height)) % 1;
    const rx = -Math.cos(a.yaw);
    const rz = Math.sin(a.yaw);
    const lateral = speed > 0.2 ? (a.vx * rx + a.vz * rz) / speed : 0;
    const base = locomotion({ speed, phase: this.phase, lateral, guarding: s.guarding, dribble: s.holding && a.action.kind === "none" ? a.dribble : null, time: this.time, seed: this.seed });

    const act = a.action;
    const wasDrive = this.lastKind === "drive";
    if (act.kind !== this.lastKind) {
      // A spin in the air ends facing the same way it started, so unwind it without turning back round.
      if (wasDrive) this.pose.spin = Math.atan2(Math.sin(this.pose.spin), Math.cos(this.pose.spin));
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
        target = blockPose(act.t, base);
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
        target = s.holding ? base : celebratePose(c.celebration, act.t);
        break;
      case "none":
        if (s.winner !== null) target = s.winner === a.team ? celebratePose(c.celebration, this.time) : dejectedPose(this.time);
        else if (this.time - this.landAt < 0.4) target = landPose(this.time - this.landAt, this.hardLand, base);
        break;
    }
    approach(this.pose, target, rate, dt);
    applyPose(this.pose, this.model.joints, this.model.dims);
    root.rotation.y = a.yaw + this.pose.spin;
    root.updateMatrixWorld(true);
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
