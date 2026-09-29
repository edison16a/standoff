import { other } from "../teams";
import { goalX } from "./goal";
import { crossHeight, SET_KICK, spotBall } from "./set-piece-aim";
import { fly, solveKick, type Kick } from "./shot-aim";
import { PITCH } from "./tuning";
import type { SetPiece } from "./types";
import { clamp, norm, sub, type Vec2, type Vec3 } from "./vec";

/** The direction to the middle of the goal the taker faces, on the turf. */
function toGoal(sp: SetPiece): Vec2 {
  return norm(sub({ x: goalX(other(sp.team)), z: 0 }, sp.spot));
}

/** The direction on the turf that an aim of `yaw` points, turned to the taker's right for a positive yaw. */
export function aimDirection(sp: SetPiece, yaw: number): Vec2 {
  const d = toGoal(sp);
  const y = clamp(yaw, -SET_KICK.maxYaw, SET_KICK.maxYaw);
  return { x: d.x * Math.cos(y) - d.z * Math.sin(y), z: d.z * Math.cos(y) + d.x * Math.sin(y) };
}

/**
 * Where the taker's aim meets the goal line. Every kick with this aim
 * ends here, whatever the curve: the curve only bends the path to it.
 * An aim that runs along the line rather than at it is held just
 * outside the post.
 */
export function aimSpot(sp: SetPiece, yaw: number = sp.aimX): Vec2 {
  const line = goalX(other(sp.team));
  const dir = aimDirection(sp, yaw);
  const run = line - sp.spot.x;
  const wide = PITCH.goalHalfWidth + SET_KICK.aimWide;
  const z = dir.x * Math.sign(run) > 0.05 ? sp.spot.z + (dir.z * run) / dir.x : Math.sign(dir.z || 1) * wide;
  return { x: line, z: clamp(z, -wide, wide) };
}

/** The aim that sends a straight kick to `z` on the goal line, for a computer taker. */
export function yawToward(sp: SetPiece, z: number): number {
  const d = toGoal(sp);
  const to = norm(sub({ x: goalX(other(sp.team)), z }, sp.spot));
  const yaw = Math.atan2(d.x * to.z - d.z * to.x, d.x * to.x + d.z * to.z);
  return clamp(yaw, -SET_KICK.maxYaw, SET_KICK.maxYaw);
}

/**
 * The sidespin for a curve setting, `range` metres from the goal line.
 * Positive curve bends to the taker's right: the swerve is spin crossed
 * with velocity.
 */
export function curveSpin(curve: number, range: number): number {
  const full = Math.min(SET_KICK.spinMax, (SET_KICK.spin * SET_KICK.spinAt) / Math.max(1, range));
  return -clamp(curve, -1, 1) * full;
}

/** The spot on the goal line the kick at `power` passes through: the aim across, the power's height up. */
export function freeKickTarget(sp: SetPiece, power: number): Vec3 {
  const at = aimSpot(sp);
  return { x: at.x, y: crossHeight(power), z: at.z };
}

let cache: { key: string; kick: Kick } | null = null;

/**
 * A free kick at `power` with the taker's aim and curve. It is solved
 * with the match's own physics to pass through the aimed spot, so a
 * bigger curve sets off wider and bends back to the same place.
 * Solved once per setting: the white line asks for it every frame.
 */
export function freeKick(sp: SetPiece, power: number): Kick {
  const target = freeKickTarget(sp, power);
  const spin = curveSpin(sp.curve, Math.hypot(target.x - sp.spot.x, target.z - sp.spot.z));
  const speed = SET_KICK.freeMin + (SET_KICK.freeMax - SET_KICK.freeMin) * clamp(power, 0, 1);
  const key = [sp.spot.x, sp.spot.z, target.y, target.z, spin, speed].map((n) => n.toFixed(3)).join(",");
  if (cache?.key !== key) cache = { key, kick: solveCurled(spotBall(sp), target, speed, spin) };
  const k = cache.kick;
  return { vel: { ...k.vel }, spin: { ...k.spin }, time: k.time };
}

/** Solves the kick through `target`, easing the spin off in the rare case the solver cannot land that much bend there. */
function solveCurled(from: Vec3, target: Vec3, speed: number, spin: number): Kick {
  for (let s = spin, i = 0; i < 4; i++, s *= 0.7) {
    const kick = solveKick(from, target, speed, s);
    const hit = fly(from, kick, target.x);
    if (hit && Math.abs(hit.z - target.z) < 0.05 && Math.abs(hit.y - target.y) < 0.05) return kick;
  }
  return solveKick(from, target, speed, 0);
}
