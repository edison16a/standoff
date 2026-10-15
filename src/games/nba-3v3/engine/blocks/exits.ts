import type { Match } from "../match";
import type { BallBody } from "../physics/air";
import { between } from "../rng";
import { COURT, RIM } from "../tuning";
import type { V2 } from "../vec";

/**
 * The ball's way off the hand for each hit. Only the first instant is
 * set here (a velocity and a spin); after that the ball flies, bounces
 * and rolls on the real physics like any other ball.
 */

/** Flat unit vector from the rim out to the ball, or toward the top of the key right under it. */
function awayFromRim(p: { x: number; z: number }): V2 {
  const x = p.x - RIM.x;
  const z = p.z - RIM.z;
  const l = Math.hypot(x, z);
  return l > 0.2 ? { x: x / l, z: z / l } : { x: 0, z: 1 };
}

function spinUp(m: Match, body: BallBody, k: number): void {
  body.w = { x: between(m.rng, -k, k), y: between(m.rng, -k / 2, k / 2), z: between(m.rng, -k, k) };
}

/**
 * The two hand rejection: both palms drive it back the way it came and
 * down, so it slams into the floor in the lane and kicks out toward the
 * top of the key.
 */
export function reject(m: Match, body: BallBody): void {
  const out = awayFromRim(body.pos);
  const side = between(m.rng, -0.3, 0.3);
  const speed = between(m.rng, 4.2, 6);
  body.vel = { x: (out.x - side * out.z) * speed, y: between(m.rng, -3.4, -1.8), z: (out.z + side * out.x) * speed };
  spinUp(m, body, 10);
}

/**
 * The one hand swat into the stands: the hand comes through hard and
 * sends it rising over the nearest sideline. It is aimed at the side the
 * ball is on, never back at the glass.
 */
export function stands(m: Match, body: BallBody): void {
  const p = body.pos;
  const sign = Math.abs(p.x) > 0.3 ? Math.sign(p.x) : m.rng() < 0.5 ? -1 : 1;
  const dir = { x: sign, z: between(m.rng, -0.15, 0.45) };
  const l = Math.hypot(dir.x, dir.z);
  const speed = between(m.rng, 10, 12.5);
  body.vel = { x: (dir.x / l) * speed, y: between(m.rng, 2.4, 4), z: (dir.z / l) * speed };
  spinUp(m, body, 18);
}

/**
 * A slap away: the hand swings through from where the blocker is, so
 * the ball goes on the way his arm travels (ahead of a chase down,
 * across from the help side), turned a little toward the open floor.
 */
export function swat(m: Match, body: BallBody, from: V2 | null): void {
  const away = awayFromRim(body.pos);
  const fx = from ? body.pos.x - from.x : away.x;
  const fz = from ? body.pos.z - from.z : away.z;
  const fl = Math.hypot(fx, fz) || 1;
  const x = (fx / fl) * 0.7 + away.x * 0.3;
  const z = (fz / fl) * 0.7 + away.z * 0.3;
  const l = Math.hypot(x, z) || 1;
  const speed = between(m.rng, 3.2, 5);
  body.vel = { x: (x / l) * speed, y: between(m.rng, -1.6, 0.8), z: (z / l) * speed };
  spinUp(m, body, 12);
}

/** A fingertip on a shot: the ball keeps much of its flight but is knocked up and off line, and goes short. */
export function tipShot(m: Match, body: BallBody): void {
  const v = body.vel;
  const side = between(m.rng, -1.2, 1.2);
  body.vel = { x: v.x * 0.45 + side * v.z * 0.15, y: Math.abs(v.y) * 0.25 + between(m.rng, 1.2, 2.4), z: v.z * 0.45 - side * v.x * 0.15 };
  spinUp(m, body, 14);
}

/** Off a closeout: the hand meets it rising and knocks it back up over the shooter's head. */
export function deflect(m: Match, body: BallBody): void {
  const v = body.vel;
  const back = between(m.rng, 0.25, 0.42);
  const side = between(m.rng, -0.6, 0.6);
  body.vel = { x: -v.x * back + side * v.z * 0.2, y: between(m.rng, 1.6, 3), z: -v.z * back - side * v.x * 0.2 };
  spinUp(m, body, 12);
}

/** Pinned to the glass: the open palm takes it flat against the board, and it drops off down the face. */
export function pin(m: Match, body: BallBody): void {
  body.vel = { x: between(m.rng, -0.4, 0.4), y: between(m.rng, 0.2, 0.7), z: -between(m.rng, 2, 2.8) };
  body.w = { x: between(m.rng, -3, 3), y: 0, z: between(m.rng, -3, 3) };
}

/** True when a point is past a sideline or the baseline. */
export const pastLine = (p: { x: number; z: number }): boolean => Math.abs(p.x) > COURT.halfWidth || p.z < 0;
