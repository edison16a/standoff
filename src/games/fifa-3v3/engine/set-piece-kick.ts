import { attackSign, other } from "../teams";
import { newBall, stepBall } from "./ball";
import { shotSpread } from "./charge";
import { goalX } from "./goal";
import { fly, solveKick, type Kick } from "./shot-aim";
import { BALL, PITCH, STEP } from "./tuning";
import type { Rng } from "./rng";
import type { SetPiece } from "./types";
import { clamp, norm, sub, type Vec3 } from "./vec";

/**
 * How a set piece leaves the boot. The same numbers draw the white line
 * the taker lines it up with and fly the real kick, so what the line
 * shows is what the ball does (the wall, the keeper and a wild red zone
 * strike aside).
 */
export const SET_KICK = {
  /** Pace off the boot for an empty power bar and a full one. */
  freeMin: 15,
  freeMax: 30,
  penMin: 17,
  penMax: 30,
  /** Sidespin at full curve, in radians a second. */
  spin: 34,
  /** At this power a free kick aimed at the goal dips in under the bar. */
  nominal: 0.55,
  crossHeight: 1.7,
  /** How far the aim may turn off the middle of the goal, and a penalty's aim across and up. */
  maxYaw: 0.5,
  penWide: PITCH.goalHalfWidth + 0.5,
  penHigh: PITCH.goalHeight + 0.6,
} as const;

/** The direction to the middle of the goal the taker faces, on the turf. */
function toGoal(sp: SetPiece): { x: number; z: number } {
  return norm(sub({ x: goalX(other(sp.team)), z: 0 }, sp.spot));
}

/** The ball on its spot. */
export function spotBall(sp: SetPiece): Vec3 {
  return { x: sp.spot.x, y: BALL.radius, z: sp.spot.z };
}

let cache: { key: string; angle: number } | null = null;

/**
 * The lift a free kick needs so that, at the nominal power and with the
 * chosen turn and curve, it dips under the bar at the goal line. More
 * power then sends it higher, less keeps it low into the wall.
 */
function elevation(sp: SetPiece, dirX: number, dirZ: number, spinY: number): number {
  const key = `${sp.spot.x.toFixed(2)},${sp.spot.z.toFixed(2)},${dirX.toFixed(3)},${dirZ.toFixed(3)},${spinY.toFixed(2)}`;
  if (cache?.key === key) return cache.angle;
  const from = spotBall(sp);
  const speed = SET_KICK.freeMin + (SET_KICK.freeMax - SET_KICK.freeMin) * SET_KICK.nominal;
  const line = goalX(other(sp.team));
  let lo = 0.02;
  let hi = 0.75;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const hit = fly(from, launch(dirX, dirZ, speed, mid, spinY), line);
    if (!hit || hit.y < SET_KICK.crossHeight) lo = mid;
    else hi = mid;
  }
  cache = { key, angle: (lo + hi) / 2 };
  return cache.angle;
}

function launch(dirX: number, dirZ: number, speed: number, angle: number, spinY: number): Kick {
  const flat = Math.cos(angle) * speed;
  return { vel: { x: dirX * flat, y: Math.sin(angle) * speed, z: dirZ * flat }, spin: { x: 0, y: spinY, z: 0 }, time: 0 };
}

/**
 * A free kick with the taker's turn and curve, at `power`. Positive
 * curve bends it to the taker's right: sidespin about the vertical, and
 * the swerve (spin crossed with velocity) pulls against it.
 */
export function freeKick(sp: SetPiece, power: number): Kick {
  const d = toGoal(sp);
  const right = { x: -d.z, z: d.x };
  const yaw = clamp(sp.aimX, -SET_KICK.maxYaw, SET_KICK.maxYaw);
  const dirX = d.x * Math.cos(yaw) + right.x * Math.sin(yaw);
  const dirZ = d.z * Math.cos(yaw) + right.z * Math.sin(yaw);
  const spinY = -clamp(sp.curve, -1, 1) * SET_KICK.spin;
  const speed = SET_KICK.freeMin + (SET_KICK.freeMax - SET_KICK.freeMin) * clamp(power, 0, 1);
  return launch(dirX, dirZ, speed, elevation(sp, dirX, dirZ, spinY), spinY);
}

/** Where a penalty is aimed on the goal line, in the world. */
export function penaltyTarget(sp: SetPiece): Vec3 {
  const s = attackSign(sp.team);
  return { x: goalX(other(sp.team)), y: clamp(sp.aimY, 0.12, SET_KICK.penHigh), z: s * clamp(sp.aimX, -SET_KICK.penWide, SET_KICK.penWide) };
}

/** A penalty struck at `power` through `target`, with a touch of curl. */
export function penaltyKick(sp: SetPiece, power: number, target: Vec3 = penaltyTarget(sp)): Kick {
  const speed = SET_KICK.penMin + (SET_KICK.penMax - SET_KICK.penMin) * clamp(power, 0, 1);
  return solveKick(spotBall(sp), target, speed, 0);
}

/**
 * The real strike: the planned kick with the error a power level brings.
 * Green goes where it was aimed, yellow drifts a little, and deep in the
 * red it sprays and climbs, so a blasted penalty can fly over.
 */
export function strikeKick(sp: SetPiece, rng: Rng): Kick {
  const p = sp.power;
  const spread = shotSpread(p);
  const red = Math.max(0, p - 0.8) / 0.2;
  if (sp.kind === "penalty") {
    const t = penaltyTarget(sp);
    const aimed = { x: t.x, y: t.y + rng.range(-0.3, 0.6) * spread + red * rng.range(0.4, 1.4), z: t.z + rng.range(-1, 1) * spread * 0.9 };
    return penaltyKick(sp, p, aimed);
  }
  const kick = freeKick({ ...sp, aimX: sp.aimX + rng.range(-1, 1) * spread * 0.06 }, p);
  // A red strike gets under the ball: extra lift.
  kick.vel.y += red * rng.range(0.5, 2.2);
  return kick;
}

/** Points along the planned kick, for the white line: at most `seconds` of flight, stopping past the goal line. */
export function kickPath(sp: SetPiece, seconds = 1.6): Vec3[] {
  const kick = sp.kind === "penalty" ? penaltyKick(sp, SET_KICK.nominal) : freeKick(sp, SET_KICK.nominal);
  const line = goalX(other(sp.team));
  const s = attackSign(sp.team);
  // Flown with the same physics as the match, one point every other step.
  const ball = newBall();
  ball.pos = spotBall(sp);
  ball.vel = { ...kick.vel };
  ball.spin = { ...kick.spin };
  const points: Vec3[] = [{ ...ball.pos }];
  for (let i = 1; i * STEP <= seconds; i++) {
    stepBall(ball, STEP, [], { flightOnly: true });
    if (i % 2 === 0) points.push({ ...ball.pos });
    if ((ball.pos.x - line) * s > 0.3) break;
  }
  return points;
}
