import { cycleLength } from "./stride";
import { PITCH } from "./tuning";
import type { MatchState, Referee } from "./types";
import { angleDiff, clamp, len, type Vec2 } from "./vec";

export const REF = {
  /** A jog to keep up with play, and a sprint to a foul. */
  jog: 5.2,
  sprint: 7.4,
  accel: 14,
  /** How far from the ball he keeps in open play, on the far side, out of the way. */
  trail: 8.5,
  /** He stops this far short of the foul and this far to the camera's side of it. */
  standOff: 1.9,
} as const;

/** The referee at kick off: by the centre circle on the far side. */
export function makeReferee(): Referee {
  return { pos: { x: -1.5, z: -(PITCH.centreRadius + 2) }, vel: { x: 0, z: 0 }, facing: Math.PI / 2, stride: 0, action: "follow", actionT: 0 };
}

/**
 * Runs toward a spot at up to `top`, braking to stand on it, and turns
 * to the way he runs. Returns the distance still to go.
 */
export function runTo(ref: Referee, to: Vec2, top: number, dt: number): number {
  const dx = to.x - ref.pos.x;
  const dz = to.z - ref.pos.z;
  const d = Math.hypot(dx, dz);
  // Slows as he arrives, like anyone pulling up, so he never overshoots.
  const want = d < 0.05 ? 0 : Math.min(top, Math.sqrt(2 * REF.accel * 0.6 * d));
  const wx = d > 1e-6 ? (dx / d) * want : 0;
  const wz = d > 1e-6 ? (dz / d) * want : 0;
  const ddx = wx - ref.vel.x;
  const ddz = wz - ref.vel.z;
  const dv = Math.hypot(ddx, ddz);
  const k = dv > REF.accel * dt ? (REF.accel * dt) / dv : 1;
  ref.vel.x += ddx * k;
  ref.vel.z += ddz * k;
  ref.pos.x = clamp(ref.pos.x + ref.vel.x * dt, -PITCH.halfLength + 0.5, PITCH.halfLength - 0.5);
  ref.pos.z = clamp(ref.pos.z + ref.vel.z * dt, -PITCH.halfWidth + 0.5, PITCH.halfWidth - 0.5);
  const speed = len(ref.vel);
  ref.stride += (speed * dt) / cycleLength(speed);
  if (speed > 0.4) face(ref, Math.atan2(ref.vel.z, ref.vel.x), dt);
  return d;
}

export function face(ref: Referee, angle: number, dt: number): void {
  ref.facing += clamp(angleDiff(ref.facing, angle), -8 * dt, 8 * dt);
}

/**
 * Open play: he trails the ball on the far side, diagonally behind it,
 * so he sees everything and stays out of the camera's way.
 */
export function followPlay(state: MatchState, dt: number): void {
  const ref = state.referee;
  ref.actionT += dt;
  ref.action = "follow";
  const b = state.ball.pos;
  const behind = b.x > 0 ? -1 : 1;
  const spot = { x: b.x + behind * 3.5, z: clamp(b.z - REF.trail, -PITCH.halfWidth + 1.2, PITCH.halfWidth - 1.2) };
  // Not in the middle of the goalmouth either.
  spot.x = clamp(spot.x, -PITCH.halfLength + 5, PITCH.halfLength - 5);
  runTo(ref, spot, REF.jog, dt);
  if (len(ref.vel) < 0.6) face(ref, Math.atan2(b.z - ref.pos.z, b.x - ref.pos.x), dt);
}

/** Where he stands to book a player: a stride short of the foul, on the camera's side of it. */
export function bookingSpot(at: Vec2): Vec2 {
  return { x: clamp(at.x, -PITCH.halfLength + 1, PITCH.halfLength - 1), z: clamp(at.z + REF.standOff, -PITCH.halfWidth + 0.8, PITCH.halfWidth - 0.8) };
}
