import type { Athlete } from "./athlete-types";
import { isTap } from "./charge";
import { cycleLength } from "./stride";
import { MOVE, PITCH, STEP } from "./tuning";
import { angleDiff, clamp, clampLen, len, type Vec2 } from "./vec";

/**
 * How a footballer's body moves: pushing off hard from a standstill and
 * less and less as the legs reach top speed, braking hard on the studs,
 * and only so much sideways grip, so a sprinter cannot turn on a sixpence:
 * he runs a curve, or plants, slows and cuts. Momentum carries through.
 */
export const RUN = {
  /** Push from a standstill, m/s squared, for the slowest and the quickest; it fades as speed builds. */
  push: 9,
  pushPace: 4,
  /** The hardest a player can brake. */
  brake: 11,
  /** Most sideways grip, m/s squared: a sprinter at 8 m/s turns on a 7 m circle at best. */
  grip: 9,
  /** With the ball at the feet the turns are gentler. */
  gripBall: 7.5,
  /** Below this speed a player steps round on the spot rather than running a curve. */
  pivot: 1.2,
} as const;

/** Top running speed in metres per second, from the pace rating. */
export function topSpeed(a: Athlete): number {
  // Ratings run from about 60 to 99, so that range spans slowest to fastest.
  const pace = clamp((a.attrs.pace - 0.6) / 0.4, 0, 1);
  return MOVE.slowest + (MOVE.fastest - MOVE.slowest) * pace;
}

/** The push off the turf at this speed: strongest from a standstill, nothing left at full speed. */
export function drive(a: Athlete, speed: number, top: number): number {
  const pace = clamp((a.attrs.pace - 0.6) / 0.4, 0, 1);
  return (RUN.push + RUN.pushPace * pace) * Math.max(0.06, 1 - speed / (top * 1.06));
}

/**
 * Runs toward the wanted direction, `want` being the stick from 0 to 1.
 * The change in velocity is split along the way the body is going and
 * across it: along it the legs push (less the faster they go) or the
 * studs brake; across it only the grip turns him. So a turn at pace is a
 * wide arc unless he brakes into it, and a reversal is a stop and a
 * restart. The stride follows the ground covered so feet never skate.
 */
export function moveAthlete(a: Athlete, want: Vec2, dt: number, carrying: boolean): void {
  let top = topSpeed(a);
  if (carrying) top *= MOVE.withBall + 0.1 * a.attrs.dribbling;
  // Winding up a shot slows the run; holding the button to call for the ball does not.
  if (a.charging && carrying && !isTap(a.charge)) top *= MOVE.charging;
  const desired = clampLen(want, 1);
  const tx = desired.x * top;
  const tz = desired.z * top;
  const speed = len(a.vel);
  if (speed < RUN.pivot) {
    // Nearly still: step off any way, as hard as the legs push.
    const dvx = tx - a.vel.x;
    const dvz = tz - a.vel.z;
    const dv = Math.hypot(dvx, dvz);
    const max = drive(a, speed, top) * dt;
    const k = dv > max ? max / dv : 1;
    a.vel.x += dvx * k;
    a.vel.z += dvz * k;
  } else {
    const fx = a.vel.x / speed;
    const fz = a.vel.z / speed;
    const along = (tx - a.vel.x) * fx + (tz - a.vel.z) * fz;
    const across = (tx - a.vel.x) * -fz + (tz - a.vel.z) * fx;
    const grip = carrying ? RUN.gripBall + 2 * a.attrs.dribbling : RUN.grip;
    const push = along > 0 ? Math.min(along / dt, drive(a, speed, top)) : Math.max(along / dt, -RUN.brake);
    const turn = clamp(across / dt, -grip, grip);
    a.vel.x += (fx * push - fz * turn) * dt;
    a.vel.z += (fz * push + fx * turn) * dt;
  }
  integrate(a, dt);
  const now = len(a.vel);
  if (now > 0.35) {
    // The body faces where it runs; slow, it can turn quickly on the spot.
    const rate = now < RUN.pivot ? 12 : carrying ? MOVE.turnWithBall + 6 * a.attrs.dribbling : MOVE.turnRate;
    turnToward(a, Math.atan2(a.vel.z, a.vel.x), rate * dt);
  }
}

/**
 * Where a player running with the ball will be after `seconds` of
 * holding the stick at `stick`, run with his own legs on a copy of him:
 * the acceleration, the grip and the braking all count.
 */
export function predictRun(a: Athlete, stick: Vec2, seconds: number): { pos: Vec2; vel: Vec2 } {
  const ghost: Athlete = { ...a, pos: { ...a.pos }, vel: { ...a.vel } };
  for (let t = 0; t < seconds - 1e-9; t += STEP) moveAthlete(ghost, stick, Math.min(STEP, seconds - t), true);
  return { pos: ghost.pos, vel: ghost.vel };
}

/** Players stay on the pitch and out of the goals. */
function keepOnPitch(p: Vec2): void {
  p.x = clamp(p.x, -PITCH.halfLength + 0.3, PITCH.halfLength - 0.3);
  p.z = clamp(p.z, -PITCH.halfWidth + 0.35, PITCH.halfWidth - 0.35);
}

/** Moves by the current velocity, advancing the stride. */
export function integrate(a: Athlete, dt: number): void {
  a.pos.x += a.vel.x * dt;
  a.pos.z += a.vel.z * dt;
  keepOnPitch(a.pos);
  const speed = len(a.vel);
  a.stride += (speed * dt) / cycleLength(speed);
}

export function turnToward(a: Athlete, angle: number, maxTurn: number): void {
  const d = angleDiff(a.facing, angle);
  a.facing += clamp(d, -maxTurn, maxTurn);
}

/** Slows a player to a stop, for stumbles and getting up. */
export function brake(a: Athlete, dt: number, rate = 14): void {
  const k = Math.exp(-rate * dt);
  a.vel.x *= k;
  a.vel.z *= k;
  integrate(a, dt);
}
