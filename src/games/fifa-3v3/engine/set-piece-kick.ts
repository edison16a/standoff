import { other } from "../teams";
import { newBall, stepBall } from "./ball";
import { SET_KICK } from "./defence-tuning";
import { goalX } from "./goal";
import { solveKick } from "./shot-aim";
import { BALL, PITCH, STEP } from "./tuning";
import type { SetPiece } from "./types";
import { clamp01, fromAngle, type Vec2, type Vec3 } from "./vec";

/** How the ball leaves the boot: its velocity and its spin. */
export interface Launch {
  vel: Vec3;
  spin: Vec3;
}

/** Straight from the spot at the middle of the goal being attacked, as an angle on the pitch. */
export function baseAngle(sp: Pick<SetPiece, "team" | "spot">): number {
  return Math.atan2(-sp.spot.z, goalX(other(sp.team)) - sp.spot.x);
}

/** The direction the free kick is aimed, flat on the pitch. */
export function kickDirection(sp: Pick<SetPiece, "team" | "spot" | "aim">): Vec2 {
  return fromAngle(baseAngle(sp) + sp.aim);
}

/**
 * A free kick struck along the aim with the power set on the bar. More
 * power is quicker and rises more steeply. Topspin dips it down again,
 * and sidespin bends it: a positive curve to the taker's right.
 */
export function freeKickLaunch(sp: Pick<SetPiece, "team" | "spot" | "aim" | "curve">, power: number): Launch {
  const d = kickDirection(sp);
  const p = clamp01(power);
  const speed = SET_KICK.minSpeed + (SET_KICK.maxSpeed - SET_KICK.minSpeed) * p;
  const loft = SET_KICK.minLoft + (SET_KICK.maxLoft - SET_KICK.minLoft) * p;
  const flat = Math.cos(loft) * speed;
  const top = SET_KICK.topspin * (0.6 + 0.4 * p);
  // Spin about the pitch's up axis bends the ball; about the flat axis across its path it dips it.
  return {
    vel: { x: d.x * flat, y: Math.sin(loft) * speed, z: d.z * flat },
    spin: { x: d.z * top, y: -sp.curve * SET_KICK.sidespin, z: -d.x * top },
  };
}

/** A penalty driven at the spot picked on the goal, at the pace the bar set. */
export function penaltyLaunch(sp: Pick<SetPiece, "team" | "spot" | "target">, power: number): Launch {
  const speed = SET_KICK.penaltyMin + (SET_KICK.penaltyMax - SET_KICK.penaltyMin) * clamp01(power);
  const from = { x: sp.spot.x, y: BALL.radius, z: sp.spot.z };
  const kick = solveKick(from, { x: goalX(other(sp.team)), y: sp.target.y, z: sp.target.z }, speed, 0);
  return { vel: kick.vel, spin: kick.spin };
}

/** The kick being lined up, as it would be struck at `power`. */
export function launchFor(sp: SetPiece, power: number): Launch {
  return sp.kind === "penalty" ? penaltyLaunch(sp, power) : freeKickLaunch(sp, power);
}

/**
 * The ball's flight from the spot, sampled for the white guide line: it
 * ends where the ball crosses the goal line, leaves the pitch, or stops.
 * Walls, keepers and the woodwork are left out, as on the television guide.
 */
export function flightPath(spot: Vec2, launch: Launch, every = 3, seconds = 2.4): Vec3[] {
  const ball = newBall();
  ball.pos = { x: spot.x, y: BALL.radius, z: spot.z };
  ball.vel = { ...launch.vel };
  ball.spin = { ...launch.spin };
  const out: Vec3[] = [{ ...ball.pos }];
  const steps = Math.round(seconds / STEP);
  for (let i = 1; i <= steps; i++) {
    stepBall(ball, STEP, [], { flightOnly: true });
    const p = ball.pos;
    const beyond = Math.abs(p.x) > PITCH.halfLength || Math.abs(p.z) > PITCH.halfWidth;
    if (i % every === 0 || beyond) out.push({ ...p });
    if (beyond || Math.hypot(ball.vel.x, ball.vel.z) < 0.6) break;
  }
  return out;
}

/** The guide line for the kick being lined up, at the medium power it assumes. */
export function previewPath(sp: SetPiece): Vec3[] {
  return flightPath(sp.spot, launchFor(sp, SET_KICK.preview));
}
