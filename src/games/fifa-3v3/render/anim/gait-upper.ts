import { bump, clamp01, type Context } from "./frame";
import type { GaitStyle } from "./gait-style";
import type { Pose } from "./pose";

/**
 * Everything above the legs while running or standing. The pelvis turns
 * with the swinging leg and drops on the side that is off the ground;
 * the chest turns against it and the shoulders stay level; each arm
 * swings against its leg, a touch behind it, bending more as it comes
 * forward; and the head holds steady, its eyes on the ball. Standing,
 * the weight shifts slowly from foot to foot.
 */

const TAU = Math.PI * 2;

export interface StridePhase {
  /** The right foot's place in the cycle: 0 as it lands, its stance until `duty`, then its swing. */
  qRight: number;
  duty: number;
  /** 0 standing still, 1 on the move. */
  go: number;
}

const frac = (v: number) => v - Math.floor(v);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function upperBody(p: Pose, st: StridePhase, style: GaitStyle, ctx: Context, time: number, phase: number, dribbling: boolean): void {
  const { go, duty } = st;
  const still = 1 - go;
  const legs = Math.cos(TAU * st.qRight);
  const stanceR = st.qRight < duty ? bump(st.qRight / duty) : 0;
  const qLeft = frac(st.qRight + 0.5);
  const stanceL = qLeft < duty ? bump(qLeft / duty) : 0;
  // Standing, the weight drifts from one foot to the other every few seconds.
  const shift = Math.sin(time * 0.55 + phase * 1.3) * still;
  p.pelvisY = style.pelvisTwist * legs * go + 0.04 * Math.sin(time * 0.37 + phase) * still;
  p.pelvisZ = (stanceL - stanceR) * style.drop * go + 0.035 * shift;
  // The chest turns the other way, so the shoulders face the run while the hips swing under them.
  p.spineY = -style.chestTwist * legs * go - p.pelvisY;
  p.spineZ = -p.pelvisZ * 0.75;
  // Each arm swings against its own leg, lagging it a little, and bends further as it comes forward.
  const arms = Math.cos(TAU * (st.qRight - 0.04));
  const swing = (v: number) => (v > 0 ? v * style.armBack : v * style.armFront) * go;
  p.shRX = swing(arms);
  p.shLX = swing(-arms);
  const breath = Math.sin(time * 2.1 + phase);
  p.shLZ = p.shRZ = style.armsOut * go + (0.16 + breath * 0.015) * still;
  p.shLY = p.shRY = 0.12 * style.run * go;
  const flex = style.elbow * go + 0.15 * still;
  p.elR = -(flex + 0.35 * style.run * clamp01(-arms) * go);
  p.elL = -(flex + 0.35 * style.run * clamp01(arms) * go);
  p.spineX = (0.04 + breath * 0.012) * still + 0.04 * style.sprint * go;
  lookAtBall(p, ctx, go, dribbling);
}

/**
 * The head holds still against the turning chest and finds the ball:
 * a player off the ball watches it, a dribbler looks down at it.
 */
function lookAtBall(p: Pose, ctx: Context, go: number, dribbling: boolean): void {
  // Undo the chest's turn so the head faces the way the body runs.
  p.neckY = -(p.pelvisY + p.spineY) * 0.85;
  const { ball } = ctx;
  const ahead = Math.hypot(ball.x, ball.z);
  const yaw = clamp(Math.atan2(ball.x, ball.z), -1.25, 1.25);
  const down = Math.atan2(1.6 * ctx.build.s - ball.y, Math.max(0.3, ahead));
  if (dribbling) {
    p.neckX = 0.3 + 0.1 * clamp01((down - 0.6) / 0.6);
    return;
  }
  const w = 0.75 - 0.4 * go;
  // The neck does most of the turning; the shoulders help with a ball off to one side.
  p.neckY += yaw * w * 0.75;
  p.spineY += yaw * w * 0.25;
  p.neckX = -0.04 - 0.4 * p.pitch + clamp(down, -0.4, 0.6) * w * 0.5;
}
