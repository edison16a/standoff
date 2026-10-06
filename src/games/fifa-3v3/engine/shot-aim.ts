import { cloneBall, newBall, stepBall } from "./ball";
import { BALL, STEP } from "./tuning";
import type { Vec3 } from "./vec";

export interface Kick {
  vel: Vec3;
  spin: Vec3;
  /** Seconds until the ball reaches the target's line. */
  time: number;
}

/**
 * Finds the kick that sends a ball from `from` through `target`, at
 * about `speed`, with curl from `spinY`. It flies trial balls with the
 * very same physics the match uses and corrects the aim until they pass
 * within a couple of centimetres, so the kick flies to the spot the
 * striker picked before his own error is put in.
 */
export function solveKick(from: Vec3, target: Vec3, speed: number, spinY: number): Kick {
  let aimZ = target.z;
  let aimY = target.y;
  let kick = kickToward(from, { x: target.x, y: aimY, z: aimZ }, speed, spinY);
  for (let i = 0; i < 10; i++) {
    const hit = fly(from, kick, target.x);
    if (!hit) {
      // Fell short of the line, so lift it and try again.
      aimY += 0.5;
    } else {
      const ez = target.z - hit.z;
      const ey = target.y - hit.y;
      if (Math.abs(ez) < 0.015 && Math.abs(ey) < 0.015) return { ...kick, time: hit.t };
      aimZ += ez;
      aimY += ey;
    }
    kick = kickToward(from, { x: target.x, y: aimY, z: aimZ }, speed, spinY);
  }
  return { ...kick, time: fly(from, kick, target.x)?.t ?? 1 };
}

/** A first guess that ignores drag and swerve: straight at the point, lifted for gravity. */
function kickToward(from: Vec3, to: Vec3, speed: number, spinY: number): Kick {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const d = Math.max(0.5, Math.hypot(dx, dz));
  const t = d / speed;
  const vy = (to.y - from.y) / t + 0.5 * BALL.gravity * t;
  return { vel: { x: (dx / d) * speed, y: vy, z: (dz / d) * speed }, spin: { x: 0, y: spinY, z: 0 }, time: t };
}

/** Flies a trial ball and reports where it crosses the plane at `lineX`. */
export function fly(from: Vec3, kick: Kick, lineX: number): { y: number; z: number; t: number } | null {
  const ball = newBall();
  ball.pos = { ...from };
  ball.vel = { ...kick.vel };
  ball.spin = { ...kick.spin };
  const dir = Math.sign(lineX - from.x) || 1;
  for (let t = 0; t < 4; t += STEP) {
    const before = cloneBall(ball);
    stepBall(ball, STEP, [], { flightOnly: true });
    if ((ball.pos.x - lineX) * dir >= 0) {
      const span = ball.pos.x - before.pos.x;
      const f = Math.abs(span) > 1e-9 ? (lineX - before.pos.x) / span : 1;
      return {
        y: before.pos.y + (ball.pos.y - before.pos.y) * f,
        z: before.pos.z + (ball.pos.z - before.pos.z) * f,
        t: t + STEP * f,
      };
    }
    if (Math.hypot(ball.vel.x, ball.vel.z) < 0.5) return null;
  }
  return null;
}
