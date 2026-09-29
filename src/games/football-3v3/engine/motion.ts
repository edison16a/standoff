import { gripOf, pushOf, topSpeed } from "./body";
import { clampToWorld } from "./field";
import { MOVE, RUSH } from "./tuning";
import type { Athlete } from "./types";
import { angleDiff, clamp, yawOf, type V2 } from "./vec";

/**
 * Heavy, momentum driven running. The push is strongest from a
 * standstill and fades to nothing at top speed, and is weaker for heavier
 * players. Turning is limited by sideways grip, so a player at full speed
 * curves on a radius of speed squared over grip instead of snapping
 * round, and stopping takes braking distance.
 */
export function steer(a: Athlete, tx: number, tz: number, top: number, dt: number): void {
  const speed = Math.hypot(a.vx, a.vz);
  const dvx = tx - a.vx;
  const dvz = tz - a.vz;
  const dv = Math.hypot(dvx, dvz);
  if (dv < 1e-6) return;
  const drive = pushOf(a) * Math.max(0.12, 1 - speed / Math.max(1, top));
  if (speed < 0.4) {
    // From a standstill every direction is a fresh push.
    const k = Math.min(1, (Math.max(drive, 2) * dt) / dv);
    a.vx += dvx * k;
    a.vz += dvz * k;
    return;
  }
  const ux = a.vx / speed;
  const uz = a.vz / speed;
  const along = dvx * ux + dvz * uz;
  const across = -dvx * uz + dvz * ux;
  const alongLimit = (along > 0 ? drive : MOVE.brake) * dt;
  const acrossLimit = gripOf(a) * dt;
  const da = clamp(along, -alongLimit, alongLimit);
  const dc = clamp(across, -acrossLimit, acrossLimit);
  a.vx += ux * da - uz * dc;
  a.vz += uz * da + ux * dc;
}

/** Slides to a stop, as a player on the ground does. */
export function friction(a: Athlete, decel: number, dt: number): void {
  const speed = Math.hypot(a.vx, a.vz);
  if (speed < 1e-6) return;
  const k = Math.max(0, speed - decel * dt) / speed;
  a.vx *= k;
  a.vz *= k;
}

/**
 * Moves one player for a step. Free legs run toward the stick; a
 * blocked player pushes through a lineman at a fraction of their speed.
 * `face` is a point to look at while standing, such as the ball.
 */
export function moveAthlete(a: Athlete, dt: number, hasBall: boolean, face: V2 | null): void {
  const k = a.action.kind;
  if (k === "stance") {
    a.vx = 0;
    a.vz = 0;
  } else if (k === "none" || k === "throw" || k === "celebrate" || k === "kick") {
    const slow = k === "throw" ? 0.55 : k === "kick" ? 0 : 1;
    const through = a.blocked > 0 ? (a.rushT > 0 ? RUSH.rushing : RUSH.blocked) : 1;
    const top = topSpeed(a, hasBall) * slow * through;
    steer(a, a.move.x * top, a.move.z * top, top, dt);
  } else if (k === "down") {
    friction(a, 7, dt);
  }
  a.x += a.vx * dt;
  a.z += a.vz * dt;
  const p = clampToWorld(a);
  if (p.x !== a.x) a.vx = 0;
  if (p.z !== a.z) a.vz = 0;
  a.x = p.x;
  a.z = p.z;
  turn(a, dt, face);
}

function turn(a: Athlete, dt: number, face: V2 | null): void {
  const k = a.action.kind;
  if (k === "down" || k === "juke" || k === "dive" || k === "lunge") return;
  const speed = Math.hypot(a.vx, a.vz);
  let want = a.yaw;
  if (a.aim && k !== "kick") want = yawOf(a.aim.x, a.aim.z);
  else if (speed > 0.8) want = yawOf(a.vx, a.vz);
  else if (face) want = yawOf(face.x - a.x, face.z - a.z);
  const rate = MOVE.turnRate * dt;
  a.yaw += clamp(angleDiff(a.yaw, want), -rate, rate);
}
