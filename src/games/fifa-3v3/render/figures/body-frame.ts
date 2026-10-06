import { shotWindup } from "../../engine/kick";
import { PASS } from "../../engine/tuning";
import type { AthleteView, BallView } from "../../engine/view";
import type { Local } from "../anim/frame";

/** A lofted pass has the longer wind up, which shows in the action's length. */
export const lofted = (v: AthleteView) => v.action === "pass" && v.actionLen > PASS.windup + 0.34;

/** When a kick meets the ball, as the engine times it (engine/kick.ts). */
export function windupOf(v: AthleteView): number {
  if (v.action === "shoot") return shotWindup(v.power);
  return lofted(v) ? PASS.windup + 0.08 : PASS.windup;
}

/**
 * The ball and the way the body is travelling, in the body's own frame
 * (x to its left, z ahead). The travel comes from how the body moved
 * since the last frame, which also holds in slow motion. Once a kick has
 * sent the ball away, the follow through keeps to where the boot met it.
 */
export class BodyFrame {
  private last: { x: number; z: number } | null = null;
  private readonly move = { x: 0, y: 0, z: 1 };
  private ball: Local = { x: 0, y: 0, z: 0.5 };
  /** The move the remembered ball belongs to. */
  private ballKick = "";

  read(v: AthleteView, ball: BallView): { move: Local; ball: Local } {
    const c = Math.cos(v.facing);
    const s = Math.sin(v.facing);
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
    const kicked = (v.action === "shoot" || v.action === "pass") && !v.hasBall;
    const local = (x: number, y: number, z: number) => ({ x: x * s - z * c, y, z: x * c + z * s });
    if (!kicked) {
      this.ball = local(bx, ball.y, bz);
      this.ballKick = v.action;
    } else if (this.ballKick !== v.action) {
      // A still that starts after the strike never saw the ball at the boot: run its flight back to the strike.
      const since = Math.max(0, v.actionT - windupOf(v));
      this.ball = local(bx - ball.vx * since, Math.max(0.11, ball.y - ball.vy * since), bz - ball.vz * since);
      this.ballKick = v.action;
    }
    return { move: this.move, ball: this.ball };
  }
}
