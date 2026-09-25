import { BALL } from "../../engine/tuning";
import { bump, smooth, track, type Context, type Frame, type Key } from "./frame";
import { gait } from "./gait";
import type { Foot, Side } from "./leg-ik";
import { neutral } from "./pose";

/**
 * Striking the ball. The standing foot plants beside it, the kicking
 * leg draws back and swings through to meet the ball exactly when the
 * simulation strikes it, and follows through along the ball's line.
 * Everything is keyed off the ball where it is drawn, so the boot finds
 * it wherever the dribble left it. The lead foot kicks; the other plants.
 */

const R = BALL.radius;

/** Sets the arms and the turn of the trunk; `side` is the kicking foot, so its arm swings across. */
function arms(f: Frame, kick: Side, open: number, across: number): void {
  const p = f.pose;
  // The standing side's arm flies out wide for balance; the kicking side's swings across the body.
  const balance = 0.25 + 0.95 * open;
  const swing = -0.2 + 0.9 * across;
  if (kick === -1) {
    p.shLZ = balance;
    p.shLX = -0.35 * open;
    p.shRX = -swing;
    p.shRZ = 0.25 + 0.3 * open;
  } else {
    p.shRZ = balance;
    p.shRX = -0.35 * open;
    p.shLX = -swing;
    p.shLZ = 0.25 + 0.3 * open;
  }
  p.elL = p.elR = -0.45;
}

/** The shot, `t` seconds in; the boot meets the ball at `windup`. More power means a bigger swing. */
export function shotFrame(t: number, windup: number, power: number, ctx: Context): Frame {
  const { build: b, ball } = ctx;
  const kick = ctx.lead;
  const stand = -kick as Side;
  const s = b.s;
  const red = smooth((power - 0.8) / 0.2);
  const f: Frame = { pose: neutral(), left: null, right: null };
  const p = f.pose;
  const back = smooth(t / (windup * 0.8));
  const strike = smooth((t - windup * 0.8) / (windup * 0.2));
  const through = smooth((t - windup) / 0.22);
  const settle = smooth((t - windup - 0.24) / 0.16);
  // Coiled over the ball on the backswing, uncoiling through it; a full power strike leans back.
  p.spineY = kick * (0.35 + 0.2 * power) * back - kick * (0.55 + 0.25 * power) * strike * (1 - 0.5 * settle);
  p.pitch = 0.05 - 0.06 * back + (0.16 + 0.06 * power - 0.3 * red) * strike * (1 - settle) - 0.06 * red * through;
  p.spineX = 0.1 * back - 0.12 * red * through;
  p.lift = -0.05 * back - 0.04 * strike + 0.1 * power * bump((t - windup) / 0.3) * (1 - settle);
  p.neckX = 0.35 * (1 - through) + 0.1;
  p.fwd = stepIn(ball.z, s, t / (windup * 0.7), settle);
  arms(f, kick, back * (1 - 0.3 * settle), strike * (1 - settle));
  // The standing foot strides in and plants beside the ball, a little behind it.
  const plantAt = windup * 0.7;
  const beside: Foot = { x: ball.x + stand * (0.2 + 0.03 * power) * s, y: b.ground, z: ball.z - 0.1 * s, toe: 0 };
  const from: Foot = { x: stand * b.hipW, y: b.ground, z: -0.25 * s, toe: 0.4 };
  const standing = t < plantAt ? track(t, [[0, from], [plantAt * 0.5, { ...mid(from, beside), y: b.ground + 0.1 * s }], [plantAt, beside]]) : { ...beside, plant: true };
  // The kicking boot: drawn back and up, then through the ball's back, then on along the line.
  const up = 0.28 + 0.3 * power;
  const keys: Key[] = [
    [0, { x: kick * b.hipW, y: b.ground + 0.05 * s, z: 0.05 * s, toe: 0.3 }],
    [windup * 0.78, { x: kick * b.hipW * 0.9, y: b.ground + up * s, z: -(0.3 + 0.28 * power) * s, toe: 1.1 }],
    [windup, { x: ball.x + kick * 0.02, y: ball.y + 0.05 * s, z: ball.z - R - 0.07 * s, toe: 1.25 }],
    // Out along the ball's line with the knee locked, higher the harder it was hit.
    [windup + 0.2, { x: ball.x - kick * 0.12 * s, y: b.ground + (0.3 + 0.55 * power - 0.1 * red) * s, z: (0.72 + 0.1 * power) * s, toe: 0.7 }],
    [windup + 0.4, { x: kick * b.hipW, y: b.ground, z: 0.3 * s, toe: 0 }],
  ];
  const kicking = track(t, keys);
  if (kick === 1) {
    f.left = kicking;
    f.right = standing;
  } else {
    f.right = kicking;
    f.left = standing;
  }
  return f;
}

/** A side foot pass: short backswing, the inside of the boot through the ball, and a low follow through. */
export function passFrame(t: number, windup: number, lofted: boolean, ctx: Context): Frame {
  const { build: b, ball } = ctx;
  const kick = ctx.lead;
  const stand = -kick as Side;
  const s = b.s;
  const f: Frame = { pose: neutral(), left: null, right: null };
  const p = f.pose;
  const back = smooth(t / (windup * 0.8));
  const strike = smooth((t - windup * 0.8) / (windup * 0.2));
  const settle = smooth((t - windup - 0.15) / 0.15);
  p.spineY = kick * 0.2 * back - kick * 0.3 * strike * (1 - settle);
  p.pitch = 0.08 + (lofted ? -0.08 : 0.06) * strike * (1 - settle);
  p.lift = -0.04 * back;
  p.neckX = 0.3;
  p.fwd = stepIn(ball.z, s, t / (windup * 0.6), settle);
  arms(f, kick, 0.6 * back * (1 - settle), 0.5 * strike * (1 - settle));
  const plantAt = windup * 0.6;
  const beside: Foot = { x: ball.x + stand * 0.2 * s, y: b.ground, z: ball.z - 0.08 * s, toe: 0 };
  const from: Foot = { x: stand * b.hipW, y: b.ground, z: -0.15 * s, toe: 0.3 };
  const standing = t < plantAt ? track(t, [[0, from], [plantAt * 0.5, { ...mid(from, beside), y: b.ground + 0.08 * s }], [plantAt, beside]]) : { ...beside, plant: true };
  const keys: Key[] = [
    [0, { x: kick * b.hipW, y: b.ground + 0.03 * s, z: 0, toe: 0.2 }],
    [windup * 0.8, { x: kick * b.hipW * 1.4, y: b.ground + 0.14 * s, z: -0.28 * s, toe: 0.2 }],
    // The inside of the boot, so the ankle sits just to the kicking side of the ball's back.
    [windup, { x: ball.x + kick * 0.07 * s, y: b.ground + 0.03 * s, z: ball.z - R - 0.03 * s, toe: lofted ? 0.5 : 0 }],
    [windup + 0.14, { x: ball.x - kick * 0.1 * s, y: b.ground + (lofted ? 0.4 : 0.14) * s, z: ball.z + 0.25 * s, toe: 0.2 }],
    [windup + 0.3, { x: kick * b.hipW, y: b.ground, z: 0.2 * s, toe: 0 }],
  ];
  const kicking = track(t, keys);
  if (kick === 1) {
    f.left = kicking;
    f.right = standing;
  } else {
    f.right = kicking;
    f.left = standing;
  }
  return f;
}

/**
 * Holding Shoot: still running, but coiling up, the trunk turning away
 * from the ball, the far arm opening and the body sinking lower the
 * fuller the bar gets.
 */
export function coilFrame(stride: number, speed: number, charge: number, ctx: Context, time: number, phase: number): Frame {
  const f = gait(stride, speed, true, ctx, time, phase);
  const p = f.pose;
  const c = smooth(charge);
  const kick = ctx.lead;
  p.spineY += kick * 0.38 * c;
  p.neckY -= kick * 0.25 * c;
  p.lift -= 0.05 * c;
  p.pitch += 0.06 * c;
  p.neckX = 0.35;
  if (kick === -1) p.shLZ += 0.7 * c;
  else p.shRZ += 0.7 * c;
  return f;
}

/**
 * The simulation keeps the kicker a stride behind the ball, so the
 * body steps in over its standing foot for the strike and eases back
 * after it.
 */
function stepIn(ballZ: number, s: number, into: number, settle: number): number {
  return Math.max(0, Math.min(0.4 * s, ballZ - 0.3 * s)) * smooth(into) * (1 - settle);
}

const mid = (a: Foot, b: Foot): Foot => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, toe: (a.toe + b.toe) / 2 });
