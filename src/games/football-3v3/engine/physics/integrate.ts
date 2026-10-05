import { airLoad } from "./aero";
import { BALL_SHAPE, GRAVITY, omegaOf } from "./ball-shape";
import { qSpin } from "./quat";
import type { TurfBody } from "./turf";

/**
 * The ball's fixed sub step: 480 a second, eight to every match step.
 * At 30 m/s the ball moves 6 cm a step, less than its own radius, so
 * nothing it can touch is ever stepped over.
 */
export const SUB = 1 / 480;

/** Optional switches, for tests that check the rigid body on its own. */
export interface StepOptions {
  air?: boolean;
  gravity?: boolean;
}

/**
 * One sub step of free flight: the air and gravity push the ball
 * (semi implicit Euler), the air's torque changes its angular momentum,
 * and the orientation turns by the angular velocity at the half step
 * (a midpoint rule), so a spinning ball keeps its energy and a spiral's
 * gyroscope behaves.
 */
export function integrate(b: TurfBody, h: number, options: StepOptions = {}): void {
  const air = options.air ?? true;
  const g = (options.gravity ?? true) ? GRAVITY : 0;
  const m = BALL_SHAPE.mass;
  if (air) {
    const { force, torque } = airLoad(b.q, b.vel, b.L);
    b.vel.x += (force.x / m) * h;
    b.vel.y += (force.y / m - g) * h;
    b.vel.z += (force.z / m) * h;
    b.L.x += torque.x * h;
    b.L.y += torque.y * h;
    b.L.z += torque.z * h;
  } else {
    b.vel.y -= g * h;
  }
  b.pos.x += b.vel.x * h;
  b.pos.y += b.vel.y * h;
  b.pos.z += b.vel.z * h;
  const half = qSpin(b.q, omegaOf(b.q, b.L), h / 2);
  b.q = qSpin(b.q, omegaOf(half, b.L), h);
}
