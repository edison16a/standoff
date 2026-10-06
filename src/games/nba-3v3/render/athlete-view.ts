import * as THREE from "three";
import { BUILDS } from "../builds";
import { palmHold } from "../engine/dribble-ball";
import type { Athlete } from "../engine/types";
import { TEAMS } from "../roster";
import { actionPose, type ActionMemory } from "./anim/action-pose";
import { basePose, type AthleteScene } from "./anim/base";
import { ClothAndBreath } from "./anim/cloth";
import { Flinch } from "./anim/flinch";
import { strideLength, type Stride } from "./anim/locomotion";
import { applyPose, approach, STAND, type Pose } from "./anim/pose";
import { reachArm, type ArmChain } from "./arm-ik";
import { DribbleHand } from "./dribble-hand";
import type { AthleteMaterials } from "./materials/athlete-materials";
import { buildAthlete, type AthleteModel } from "./models/athlete-model";
import { Placement } from "./placement";

export type { AthleteScene };

const v = new THREE.Vector3();
/** The palm, in the hand's frame, where the ball sits under it. */
const PALM = new THREE.Vector3(0, -0.07, 0.03);
/** Each dribbling elbow points out and back, in the torso's frame; catching, out and down. */
const POLE = { L: new THREE.Vector3(0.7, -0.25, -0.65), R: new THREE.Vector3(-0.7, -0.25, -0.65) };
const CATCH_POLE = { L: new THREE.Vector3(0.6, -0.8, 0), R: new THREE.Vector3(-0.6, -0.8, 0) };
const side = new THREE.Vector3();
const grip = new THREE.Vector3();

/**
 * One player on screen: the model, and the animation that follows the
 * engine's state. The gait, the dribble and the stance blend underneath
 * and the actions play over them (see `anim/action-pose.ts`), each on
 * the engine's own clock. The stride follows the ground covered so the
 * feet stay planted, the dribbling hand reaches for the real ball, the
 * shorts swing and the chest breathes, and a hit jolts the body.
 */
export class AthleteView {
  readonly model: AthleteModel;
  private readonly pose: Pose = { ...STAND };
  private phase = 0;
  private lastY = 0;
  private lastKind = "none";
  private readonly mem: ActionMemory = { time: 0, releasedAt: null, endedAt: -9, landAt: -9, hardLand: false };
  private readonly placement: Placement;
  private readonly seed: number;
  private readonly lastV = new THREE.Vector2();
  private ahead = 0;
  private side = 0;
  private readonly stride: Stride = { air: 0 };
  private readonly cloth: ClothAndBreath;
  private readonly flinch = new Flinch();
  private readonly dribbleHand = new DribbleHand();
  private readonly arms: Record<"L" | "R", ArmChain>;

  /** `backName` goes across the jersey: the player's own name, or the build's for a computer player. */
  constructor(readonly athlete: Athlete, mats: AthleteMaterials, parent: THREE.Object3D, backName?: string) {
    this.model = buildAthlete(BUILDS[athlete.build], TEAMS[athlete.team], mats, { backName });
    this.seed = athlete.id * 1.7;
    this.cloth = new ClothAndBreath(this.seed);
    this.placement = new Placement(athlete);
    const j = this.model.joints;
    this.arms = { L: { shoulder: j.shoulderL, elbow: j.elbowL, hand: j.handL }, R: { shoulder: j.shoulderR, elbow: j.elbowR, hand: j.handR } };
    parent.add(j.root);
  }

  update(a: Athlete, s: AthleteScene, dt: number): void {
    const m = this.mem;
    m.time += dt;
    const speed = Math.hypot(a.vx, a.vz);
    const dims = this.model.dims;
    this.advanceStride(a, s, speed, dt);
    this.feelMomentum(a, dt);
    // The way of travel in the player's own frame: ahead along his facing, his left a quarter turn round.
    const heading = Math.atan2(a.vx * Math.cos(a.yaw) - a.vz * Math.sin(a.yaw), a.vx * Math.sin(a.yaw) + a.vz * Math.cos(a.yaw));
    const leg = dims.thigh + dims.shin;
    const base = basePose(a, s, { speed, phase: this.phase, ahead: this.ahead, side: this.side, time: m.time, seed: this.seed, heading, leg, stride: this.stride });
    this.track(a);
    const { pose: target, rate } = actionPose(a, BUILDS[a.build], s, base, m);
    approach(this.pose, target, rate, dt);
    const shown = this.flinch.apply({ ...this.pose }, dt);
    const j = this.model.joints;
    applyPose(shown, j, dims);
    this.placement.place(a, j.root, shown.spin, dt);
    const free = a.action.kind === "none" || a.action.kind === "move";
    this.placement.plant(a, this.model, { L: shown.footL, R: shown.footR }, dt, free ? this.stride.air * 0.022 * dims.height : 0);
    j.root.updateMatrixWorld(true);
    this.reachForBall(a, s, dt);
    this.cloth.update(j, this.model.extras, speed, dt);
    j.root.updateMatrixWorld(true);
  }

  /** A push from a collision, along (x, z) in the world, of strength 0 to 1. */
  hit(x: number, z: number, power: number): void {
    const len = Math.hypot(x, z) || 1;
    const yaw = this.athlete.yaw;
    const ahead = (x * Math.sin(yaw) + z * Math.cos(yaw)) / len;
    const left = (x * Math.cos(yaw) - z * Math.sin(yaw)) / len;
    this.flinch.hit(ahead, left, power);
  }

  /** The dribbling hand on the real ball: riding it down on the push, waiting where it will come back up. */
  private reachForBall(a: Athlete, s: AthleteScene, dt: number): void {
    const ball = s.ball ?? null;
    const kind = a.action.kind;
    const active = !!ball && s.holding && !s.chest && (kind === "none" || kind === "move") && !palmHold(a) && (ball.hand === "dribble" || ball.hand === "free");
    this.dribbleHand.update(a, ball, active, dt);
    for (const k of ["L", "R"] as const) reachArm(this.arms[k], this.dribbleHand.target, PALM, POLE[k], this.dribbleHand.weight[k]);
    // A pass on its way in: both hands reach out to either side of the ball, palms toward it.
    if (!ball || s.holding || ball.mode !== "flight" || s.receiving <= 0) return;
    side.set(Math.cos(a.yaw), 0, -Math.sin(a.yaw)).multiplyScalar(0.125);
    const w = Math.min(1, s.receiving * 1.6);
    for (const [k, sign] of [["L", 1], ["R", -1]] as const) {
      grip.set(ball.pos.x, ball.pos.y, ball.pos.z).addScaledVector(side, sign);
      reachArm(this.arms[k], grip, PALM, CATCH_POLE[k], w * w);
    }
  }

  /** Notes the start and end of each action and the landing after a jump, for the actions' timing. */
  private track(a: Athlete): void {
    const m = this.mem;
    const kind = a.action.kind;
    const wasDrive = this.lastKind === "drive";
    if (kind !== this.lastKind) {
      // A spin in the air ends facing the same way it started, so unwind it without turning back round.
      if (wasDrive) this.pose.spin = Math.atan2(Math.sin(this.pose.spin), Math.cos(this.pose.spin));
      if (kind === "none") m.endedAt = m.time;
      m.releasedAt = null;
      this.lastKind = kind;
    }
    if (this.lastY > 0.05 && a.y <= 0.001) {
      m.landAt = m.time;
      m.hardLand = kind === "drive" || wasDrive;
    }
    this.lastY = a.y;
  }

  /**
   * Moves the legs through their stride by the ground covered, so the
   * feet stay planted. On the run with the ball the stride is also
   * drawn gently into step with the dribble, the ball hitting the floor
   * as the foot opposite the ball hand lands.
   */
  private advanceStride(a: Athlete, s: AthleteScene, speed: number, dt: number): void {
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
    return this.arms[side].hand.localToWorld(out.copy(PALM));
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
