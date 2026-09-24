import type { TeamId } from "../teams";
import { cloneBall, newBall, stepBall } from "./ball";
import { goalX } from "./goal";
import type { Rng } from "./rng";
import { BALL, PITCH, STEP } from "./tuning";
import type { Keeper, ShotOutcome } from "./types";
import { clamp, type Vec3 } from "./vec";

const GW = PITCH.goalHalfWidth;
const GH = PITCH.goalHeight;
const R = BALL.radius;
/** The widest a ball can cross the line and still be all inside the posts. */
const INSIDE = GW - PITCH.postRadius - R - 0.06;

/**
 * Where a shot with this outcome crosses the line. Goals go into the
 * side away from the keeper, saves come within reach of the gloves (on
 * the keeper's line), and the woodwork is hit just off centre so the
 * ball bounces away from goal rather than in.
 */
export function aimPoint(outcome: ShotOutcome, defending: TeamId, keeper: Keeper, rng: Rng): Vec3 {
  const x = goalX(defending);
  const kz = keeper.pos.z;
  const away = Math.abs(kz) < 0.25 ? rng.sign() : kz > 0 ? -1 : 1;
  const height = () => {
    const roll = rng.next();
    if (roll < 0.5) return rng.range(0.25, 0.6);
    if (roll < 0.78) return rng.range(0.6, 1.3);
    return rng.range(1.3, GH - R - 0.14);
  };
  switch (outcome) {
    case "goal":
      return { x, y: height(), z: away * rng.range(Math.min(INSIDE - 0.1, Math.abs(kz) + 1.2), INSIDE) };
    case "catch":
      return { x: keeper.pos.x, y: rng.range(0.35, 1.5), z: clamp(kz + rng.range(-0.8, 0.8), -INSIDE, INSIDE) };
    case "parry": {
      const side = rng.sign();
      return { x: keeper.pos.x, y: rng.range(0.3, 1.8), z: clamp(kz + side * rng.range(0.7, 1.45), -INSIDE, INSIDE) };
    }
    case "post":
      return { x, y: rng.range(0.3, 1.6), z: rng.sign() * (GW + 0.07) };
    case "bar":
      return { x, y: GH + 0.08, z: rng.range(-GW + 0.4, GW - 0.4) };
    case "over":
      return { x, y: GH + rng.range(0.7, 2.2), z: rng.range(-GW, GW) * 0.9 };
    case "wide":
      return { x, y: rng.range(0.2, 1.6), z: rng.sign() * (GW + rng.range(0.5, 1.5)) };
  }
}

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
 * within a couple of centimetres, so the outcome the dice chose is
 * exactly what the ball does.
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
