import * as THREE from "three";
import { shotWindup } from "../../engine/kick";
import { PASS } from "../../engine/tuning";
import type { AthleteView, BallView } from "../../engine/view";
import { ROSTER, type Character, type Kit } from "../../roster";
import { celebration, cheer, dejected } from "../anim/celebrations";
import { smooth, type Context, type Frame } from "../anim/frame";
import { gait } from "../anim/gait";
import { coilFrame, passFrame, shotFrame } from "../anim/kicks";
import { buildOf, LEFT, RIGHT, solveLeg, type Build, type Side } from "../anim/leg-ik";
import { getUp, hurdle, slide, stumble } from "../anim/moves";
import { applyPose, blendPoses, neutral, type Pose } from "../anim/pose";
import { beatenFrame, skillFrame } from "../anim/skill-poses";
import { buildBody, type Rig } from "../models/body";
import { FootLock } from "./foot-locks";

/** How long a new move takes to blend in: kicks and tackles snap in, the rest ease. */
const QUICK = new Set(["shoot", "pass", "slide", "stumble", "skill", "beaten"]);

/**
 * One footballer on the pitch: their body in the team's kit. Each frame
 * the move they are in gives a pose and where the feet go; the legs are
 * solved to put the feet there, and a change of move cross fades from
 * the last pose shown, so nothing snaps and nothing lags.
 */
export class AthleteFigure {
  readonly rig: Rig;
  readonly character: Character;
  private readonly shown: Pose = neutral();
  private from: Pose = neutral();
  private key = "";
  private blendT = 1;
  private blendLen = 0.2;
  private readonly phase: number;
  private readonly build: Build;
  private readonly lead: Side;
  private readonly locks = { left: new FootLock(), right: new FootLock() };
  private last: { x: number; z: number } | null = null;
  private readonly move = { x: 0, y: 0, z: 1 };
  private ball = { x: 0, y: 0, z: 0.5 };
  /** The move the remembered ball belongs to. */
  private ballKick = "";

  constructor(view: AthleteView, kit: Kit, material: THREE.Material) {
    this.character = ROSTER[view.character];
    const c = this.character;
    this.rig = buildBody({ look: c.look, kit, name: c.short, number: c.number }, material);
    this.phase = view.id * 1.7;
    this.build = buildOf(c.look.height, c.look.build);
    this.lead = c.foot === "left" ? LEFT : RIGHT;
  }

  update(view: AthleteView, ball: BallView, dt: number, time: number): void {
    const root = this.rig.root;
    root.position.set(view.x, 0, view.z);
    root.rotation.y = Math.PI / 2 - view.facing;
    root.updateWorldMatrix(true, false);
    const ctx = this.context(view, ball);
    const frame = this.target(view, ctx, time);
    const left = this.locks.left.resolve(frame.left, root, this.build, dt);
    const right = this.locks.right.resolve(frame.right, root, this.build, dt);
    if (left) solveLeg(frame.pose, LEFT, left, this.build);
    if (right) solveLeg(frame.pose, RIGHT, right, this.build);
    const key = `${view.action}/${view.signature}`;
    if (key !== this.key) {
      this.from = { ...this.shown };
      this.key = key;
      this.blendT = 0;
      this.blendLen = QUICK.has(view.action) ? 0.08 : 0.2;
    }
    this.blendT = Math.min(this.blendLen, this.blendT + dt);
    blendPoses(this.shown, this.from, frame.pose, smooth(this.blendT / this.blendLen));
    applyPose(this.rig, this.shown);
    root.updateMatrixWorld(true);
    this.locks.left.remember(this.rig.ankleL);
    this.locks.right.remember(this.rig.ankleR);
  }

  /** The ball and the way the body is travelling, in the body's own frame. */
  private context(v: AthleteView, ball: BallView): Context {
    const c = Math.cos(v.facing);
    const s = Math.sin(v.facing);
    // The way the body travels, from how it moved since the last frame, which also holds in slow motion.
    if (this.last && v.speed > 0.3) {
      const dx = v.x - this.last.x;
      const dz = v.z - this.last.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-5 && d < 1) {
        this.move.x = (dx * s - dz * c) / d;
        this.move.z = (dx * c + dz * s) / d;
      }
    } else if (v.speed <= 0.3) {
      this.move.x = 0;
      this.move.z = 1;
    }
    this.last = { x: v.x, z: v.z };
    const bx = ball.x - v.x;
    const bz = ball.z - v.z;
    // Once a kick has sent the ball away, the follow through keeps to where the boot met it.
    const kicked = (v.action === "shoot" || v.action === "pass") && !v.hasBall;
    const local = (x: number, y: number, z: number) => ({ x: x * s - z * c, y, z: x * c + z * s });
    if (!kicked) {
      this.ball = local(bx, ball.y, bz);
      this.ballKick = v.action;
    } else if (this.ballKick !== v.action) {
      // A still that starts after the strike never saw the ball at the boot: run its flight back to the strike.
      const since = Math.max(0, v.actionT - this.windup(v));
      this.ball = local(bx - ball.vx * since, Math.max(0.11, ball.y - ball.vy * since), bz - ball.vz * since);
      this.ballKick = v.action;
    }
    return { build: this.build, lead: this.lead, move: this.move, ball: this.ball };
  }

  private target(v: AthleteView, ctx: Context, time: number): Frame {
    const fk = (pose: Pose): Frame => ({ pose, left: null, right: null });
    const run = () => gait(v.stride, v.speed, v.hasBall, ctx, time, this.phase);
    switch (v.action) {
      case "free":
        return v.bar ? coilFrame(v.stride, v.speed, v.charge, ctx, time, this.phase) : run();
      case "shoot":
        return shotFrame(v.actionT, this.windup(v), v.power, ctx);
      case "pass":
        return passFrame(v.actionT, this.windup(v), lofted(v), ctx);
      case "slide":
        return fk(slide(v.actionT));
      case "getup":
        return fk(getUp(v.actionT, v.actionLen));
      case "stumble":
        return fk(stumble(v.actionT));
      case "hurdle":
        return hurdle(run(), v.actionT, v.actionLen, this.build);
      case "skill":
        return skillFrame(v.skill ?? "roulette", v.actionT / Math.max(0.01, v.actionLen), v.skillSide, v.stride, v.speed, ctx, time);
      case "beaten":
        return beatenFrame(v.actionT, v.actionLen, v.stride, v.speed, v.skillSide, ctx, time, v.id);
      case "celebrate":
        return fk(v.signature ? celebration(this.character.celebration, v.actionT) : cheer(v.actionT, this.phase));
      case "dejected":
        return dejected(run(), v.actionT, this.phase);
    }
  }

  /** When a kick meets the ball, as the engine times it (engine/kick.ts). */
  private windup(v: AthleteView): number {
    if (v.action === "shoot") return shotWindup(v.power);
    return lofted(v) ? PASS.windup + 0.08 : PASS.windup;
  }

  dispose(): void {
    this.rig.dispose();
  }
}

/** A lofted pass has the longer wind up, which shows in the action's length. */
const lofted = (v: AthleteView) => v.action === "pass" && v.actionLen > PASS.windup + 0.34;
