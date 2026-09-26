import { chargeLevel } from "../../engine/charge";
import { moveOf } from "../../engine/moves";
import type { Fighter } from "../../engine/types";
import { chargingPose } from "./charging";
import { motionPose, type MotionInput } from "./motion";
import { approach, restPose, type Pose } from "./pose";
import { strikePose } from "./strike";
import type { Style } from "./style";

/** How quickly the drawn pose eases toward its target, per second, by what the fighter is doing. */
const RATE = { move: 40, charge: 14, hurt: 30, free: 18 };

export interface DriveInput {
  /** Engine steps since the match began, and how far the clock is toward the next one. */
  step: number;
  alpha: number;
  dt: number;
  time: number;
  winner: boolean;
  /** Back from a fall this frame: jump straight to the pose instead of easing. */
  appearing: boolean;
}

/**
 * Picks and eases one fighter's pose each screen frame: movement poses
 * underneath, each move on top timed from the engine's frame counter.
 * A move cancelled into another starts from the pose the body is in,
 * not from the stance, so a string flows from one swing into the next.
 */
export class PoseDriver {
  readonly pose: Pose = restPose();
  private readonly target: Pose = restPose();
  private stride = 0;
  private flipStart = -999;
  /** The swing drawn last frame, and the pose a cancelled swing grows out of. */
  private swing = -1;
  private from: Pose | null = null;

  constructor(private readonly style: Style) {}

  onJump(double: boolean, step: number): void {
    if (double) this.flipStart = step;
  }

  update(f: Fighter, d: DriveInput): Pose {
    const frozen = f.freeze > 0;
    const speed = Math.abs(f.vel.x);
    this.stride = (this.stride + (speed * d.dt) / this.style.stride) % 1;
    const frame = f.frame + (frozen ? 0 : d.alpha);
    const sinceFlip = d.step - this.flipStart + d.alpha;
    const input: MotionInput = {
      action: f.action === "attack" || f.action === "charge" ? (f.ground !== null ? "idle" : "air") : f.action,
      frame,
      speed,
      rise: f.vel.y + f.launch.y,
      stride: this.stride,
      time: d.time,
      doubleJump: f.action === "air" && sinceFlip < 24,
      launch: Math.hypot(f.launch.x, f.launch.y),
      winner: d.winner,
    };
    if (input.doubleJump) input.frame = sinceFlip;
    motionPose(this.style, input, this.target);
    let rate = RATE.free;
    if (f.action === "attack" && f.move) {
      this.noteSwing(f);
      Object.assign(this.target, strikePose(this.style.moves[f.move], moveOf(f.character, f.move), frame, this.target, this.from ?? undefined));
      rate = RATE.move;
    } else {
      this.swing = -1;
      this.from = null;
      if (f.action === "charge" && f.move) {
        chargingPose(this.style.moves[f.move], chargeLevel(f), d.time, this.target);
        rate = RATE.charge;
      } else if (f.action === "hurt" || input.doubleJump) rate = RATE.hurt;
    }
    if (d.appearing) Object.assign(this.pose, this.target);
    else approach(this.pose, this.target, rate, d.dt);
    return this.pose;
  }

  /** A new swing straight out of another keeps the body where it is as its start. */
  private noteSwing(f: Fighter): void {
    if (f.swing === this.swing) return;
    const chained = this.swing !== -1;
    this.swing = f.swing;
    // Whole body turns are left out: a somersault cut short rolls upright on its own.
    this.from = chained ? { ...this.pose, flip: 0, spin: 0 } : null;
  }
}
