import type { V3 } from "../vec";
import { BALL } from "./ball-spec";

/** The ball's state for the physics: where it is, how fast it moves, and its spin in radians a second about each axis. */
export interface BallBody {
  pos: V3;
  vel: V3;
  w: V3;
}

/**
 * The flight through the air for `h` seconds: gravity, quadratic drag,
 * and the Magnus lift of the spin, which floats a backspun jumper and
 * bends a ball with side spin. The lift grows with the spin ratio up to
 * a ceiling, as wind tunnel tests on balls show. The position takes the
 * half step of acceleration too, so a path barely changes with the
 * step size, and the air slowly takes the spin.
 */
export function airStep(b: BallBody, h: number): void {
  const { pos, vel, w } = b;
  const speed = Math.hypot(vel.x, vel.y, vel.z);
  const drag = BALL.drag * speed;
  // Lift is about the spin ratio r w / v; past the ceiling it stops growing, so scale the spin down for it.
  const spinRate = Math.hypot(w.x, w.y, w.z);
  const ratio = speed > 1e-6 ? (BALL.radius * spinRate) / speed : 0;
  const lift = ratio > BALL.maxSpinRatio ? (BALL.magnus * BALL.maxSpinRatio) / ratio : BALL.magnus;
  const ax = lift * (w.y * vel.z - w.z * vel.y) - drag * vel.x;
  const ay = lift * (w.z * vel.x - w.x * vel.z) - drag * vel.y - BALL.gravity;
  const az = lift * (w.x * vel.y - w.y * vel.x) - drag * vel.z;
  pos.x += (vel.x + 0.5 * ax * h) * h;
  pos.y += (vel.y + 0.5 * ay * h) * h;
  pos.z += (vel.z + 0.5 * az * h) * h;
  vel.x += ax * h;
  vel.y += ay * h;
  vel.z += az * h;
  const keep = Math.exp(-BALL.spinDrag * speed * h);
  w.x *= keep;
  w.y *= keep;
  w.z *= keep;
}

export function copyBody(b: BallBody): BallBody {
  return { pos: { ...b.pos }, vel: { ...b.vel }, w: { ...b.w } };
}

/** True when every number in the body is finite: a guard the tests lean on. */
export function finiteBody(b: BallBody): boolean {
  const { pos, vel, w } = b;
  return [pos.x, pos.y, pos.z, vel.x, vel.y, vel.z, w.x, w.y, w.z].every(Number.isFinite);
}
