import { BALL, GRAVITY, STEP } from "./tuning";
import type { Ball } from "./types";
import { cross3, len3, norm3, v3, type Vec3 } from "./vec";

export const BALL_DRAG = { spiral: BALL.spiralDrag, tumble: BALL.tumbleDrag } as const;

export function newBall(): Ball {
  return { pos: v3(0, 0.15, 0), vel: v3(), mode: "dead", holder: null, axis: v3(1, 0, 0), spinRate: 0, roll: 0, wobble: 0, wobblePhase: 0, tumble: 0 };
}

/** Gravity plus quadratic drag: a spiral cuts the air nose first, a tumbling kick does not. */
export function accel(vel: Vec3, drag: number): Vec3 {
  const s = len3(vel);
  return { x: -drag * s * vel.x, y: -GRAVITY - drag * s * vel.y, z: -drag * s * vel.z };
}

/** One semi implicit Euler step of a ball in the air. The same step is used to plan throws, so plans come true. */
export function integrate(pos: Vec3, vel: Vec3, drag: number, dt: number): void {
  const a = accel(vel, drag);
  vel.x += a.x * dt;
  vel.y += a.y * dt;
  vel.z += a.z * dt;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  pos.z += vel.z * dt;
}

/** Where a ball launched from `from` at `vel` is after `t` seconds, in whole steps. */
export function predict(from: Vec3, vel: Vec3, drag: number, t: number): Vec3 {
  const p = { ...from };
  const v = { ...vel };
  const steps = Math.round(t / STEP);
  for (let i = 0; i < steps; i++) integrate(p, v, drag, STEP);
  return p;
}

/**
 * The launch velocity that puts the ball on `to` after `t` seconds. Starts
 * from the drag free answer and corrects it with the real flight a few
 * times, which converges fast because drag on a spiral is small.
 */
export function solveLaunch(from: Vec3, to: Vec3, t: number, drag: number): Vec3 {
  const steps = Math.max(1, Math.round(t / STEP));
  const time = steps * STEP;
  const vel = { x: (to.x - from.x) / time, y: (to.y - from.y) / time + 0.5 * GRAVITY * time, z: (to.z - from.z) / time };
  for (let i = 0; i < 6; i++) {
    const at = predict(from, vel, drag, time);
    vel.x += (to.x - at.x) / time;
    vel.y += (to.y - at.y) / time;
    vel.z += (to.z - at.z) / time;
  }
  return vel;
}

/**
 * A thrown spiral in flight. Gyroscopic stiffness keeps the long axis
 * steady, and the drag torque on a well thrown ball slowly swings the
 * nose down to follow the path; the nutation wobble dies away.
 */
export function stepSpiral(ball: Ball, dt: number): void {
  integrate(ball.pos, ball.vel, BALL_DRAG.spiral, dt);
  const path = norm3(ball.vel);
  const k = Math.min(1, BALL.follow * dt);
  ball.axis = norm3({ x: ball.axis.x + (path.x - ball.axis.x) * k, y: ball.axis.y + (path.y - ball.axis.y) * k, z: ball.axis.z + (path.z - ball.axis.z) * k });
  ball.roll += ball.spinRate * dt;
  ball.wobble *= Math.exp(-BALL.wobbleDamp * dt);
  ball.wobblePhase += BALL.nutation * dt;
}

/** A kicked ball turns end over end about the axis across its path. */
export function stepTumble(ball: Ball, dt: number): void {
  integrate(ball.pos, ball.vel, BALL_DRAG.tumble, dt);
  ball.tumble += BALL.tumble * dt;
}

/** A loose ball bouncing along the grass, awkwardly, as a football does. */
export function stepLoose(ball: Ball, dt: number): void {
  integrate(ball.pos, ball.vel, BALL_DRAG.tumble, dt);
  ball.tumble += len3(ball.vel) * 1.5 * dt;
  if (ball.pos.y > 0.12) return;
  ball.pos.y = 0.12;
  if (ball.vel.y < 0) ball.vel.y = -ball.vel.y * BALL.restitution;
  const f = Math.exp(-3 * dt);
  ball.vel.x *= f;
  ball.vel.z *= f;
  if (Math.abs(ball.vel.y) < 0.4) ball.vel.y = 0;
}

/**
 * Where the nose really points: the steady axis tipped by the wobble,
 * going round it at the nutation rate. The renderer draws this.
 */
export function ballNose(ball: Ball): Vec3 {
  if (ball.wobble < 1e-4) return ball.axis;
  const up = Math.abs(ball.axis.y) > 0.95 ? v3(1, 0, 0) : v3(0, 1, 0);
  const u = norm3(cross3(ball.axis, up));
  const w = cross3(ball.axis, u);
  const c = Math.cos(ball.wobblePhase) * Math.sin(ball.wobble);
  const s = Math.sin(ball.wobblePhase) * Math.sin(ball.wobble);
  const k = Math.cos(ball.wobble);
  return norm3({ x: ball.axis.x * k + u.x * c + w.x * s, y: ball.axis.y * k + u.y * c + w.y * s, z: ball.axis.z * k + u.z * c + w.z * s });
}

/** Revolutions a minute, for the replay's spin reading. */
export function rpm(ball: Ball): number {
  return (ball.spinRate * 60) / (Math.PI * 2);
}
