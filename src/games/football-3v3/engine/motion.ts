import { gripOf, pushOf, topSpeed } from "./body";
import { clampToWorld } from "./field";
import { slideOf } from "./tackle-bind";
import { MOVE, PASS, RUSH } from "./tuning";
import type { Athlete } from "./types";
import { angleDiff, clamp, yawOf, type V2 } from "./vec";

/**
 * Running on cleats. Two limits shape every change of speed. The legs'
 * power pushes hard from a standstill and fades to nothing at top
 * speed, weaker for heavier players. The grip of the cleats on the turf
 * is a friction circle that speeding up, braking and turning all share,
 * so a hard turn at speed brakes and turns at once: the plant and cut.
 * The acceleration is kept on the athlete for the drawing to lean into.
 */
export function steer(a: Athlete, tx: number, tz: number, top: number, dt: number): void {
  const speed = Math.hypot(a.vx, a.vz);
  const dvx = tx - a.vx;
  const dvz = tz - a.vz;
  const dv = Math.hypot(dvx, dvz);
  if (dv < 1e-6) {
    a.ax = 0;
    a.az = 0;
    return;
  }
  const grip = gripOf(a) * (a.stagger > 0 ? MOVE.staggerGrip : 1);
  // What it would take to get there this step, held inside the friction circle.
  const want = Math.min(dv / dt, grip);
  let ax = (dvx / dv) * want;
  let az = (dvz / dv) * want;
  // Speeding up along the run is also capped by what the legs have left at this speed.
  const ux = speed > 0.4 ? a.vx / speed : dvx / dv;
  const uz = speed > 0.4 ? a.vz / speed : dvz / dv;
  const drive = Math.max(speed < 0.4 ? 2 : 0, pushOf(a) * Math.max(0.12, 1 - speed / Math.max(1, top)));
  const along = ax * ux + az * uz;
  if (along > drive) {
    ax -= (along - drive) * ux;
    az -= (along - drive) * uz;
  }
  // At speed the body's weight carries it on: less grip is left to bend the run sideways.
  const side = -ax * uz + az * ux;
  const carve = grip * (1 - (1 - MOVE.carve) * Math.min(1, speed / Math.max(1, top)) ** 2);
  if (Math.abs(side) > carve) {
    const cut = side - Math.sign(side) * carve;
    ax += cut * uz;
    az -= cut * ux;
  }
  a.vx += ax * dt;
  a.vz += az * dt;
  a.ax = ax;
  a.az = az;
}

/** Slides to a stop, as a player on the ground does. */
export function friction(a: Athlete, decel: number, dt: number): void {
  const speed = Math.hypot(a.vx, a.vz);
  a.ax = 0;
  a.az = 0;
  if (speed < 1e-6) return;
  const k = Math.max(0, speed - decel * dt) / speed;
  a.ax = (a.vx * (k - 1)) / dt;
  a.az = (a.vz * (k - 1)) / dt;
  a.vx *= k;
  a.vz *= k;
}

/**
 * On the ground: a man in a tackle preset slides out by its drag, driven
 * on while the tackler's legs still churn; anyone else skids to a stop.
 */
function slideDown(a: Athlete, dt: number): void {
  const slide = slideOf(a);
  if (!slide) return friction(a, 7, dt);
  friction(a, slide.decel, dt);
  if (slide.push <= 0 || a.action.kind !== "down" || !a.action.bind) return;
  // The drive goes along the tackle's line, away from the tackler.
  const f = a.action.bind.f;
  a.vx += f.x * slide.push * dt;
  a.vz += f.z * slide.push * dt;
  a.ax += f.x * slide.push;
  a.az += f.z * slide.push;
}

/**
 * Moves one player for a step. Free legs run toward the stick; a
 * blocked player pushes through a lineman at a fraction of their speed.
 * `face` is a point to look at while standing, such as the ball,
 * `pace` scales top speed (a QB who is still a passer is slower) and
 * `look` is a way to face whatever the legs do, as a passer does.
 */
export function moveAthlete(a: Athlete, dt: number, hasBall: boolean, face: V2 | null, pace = 1, look: V2 | null = null): void {
  const k = a.action.kind;
  if (k === "stance") {
    a.vx = 0;
    a.vz = 0;
    a.ax = 0;
    a.az = 0;
  } else if (k === "none" || k === "throw" || k === "celebrate" || k === "kick") {
    const slow = k === "throw" ? 0.55 : k === "kick" ? 0 : 1;
    const through = a.blocked > 0 ? (a.rushT > 0 ? RUSH.rushing : RUSH.blocked) : 1;
    const shaken = a.stagger > 0 ? MOVE.staggerPace : 1;
    const top = topSpeed(a, hasBall, pace) * slow * through * shaken;
    steer(a, a.move.x * top, a.move.z * top, top, dt);
  } else if (k === "down") {
    slideDown(a, dt);
  }
  a.x += a.vx * dt;
  a.z += a.vz * dt;
  const p = clampToWorld(a);
  if (p.x !== a.x) a.vx = 0;
  if (p.z !== a.z) a.vz = 0;
  a.x = p.x;
  a.z = p.z;
  turn(a, dt, face, look);
}

function turn(a: Athlete, dt: number, face: V2 | null, look: V2 | null): void {
  const k = a.action.kind;
  if (k === "down" || k === "juke" || k === "dive" || k === "lunge") return;
  const speed = Math.hypot(a.vx, a.vz);
  let want = a.yaw;
  if (a.aim && k !== "kick") want = yawOf(a.aim.x, a.aim.z);
  else if (look) want = yawOf(look.x, look.z);
  else if (speed > 0.8) want = yawOf(a.vx, a.vz);
  else if (face) want = yawOf(face.x - a.x, face.z - a.z);
  // A passer snaps his shoulders round to the target far quicker than a runner turns.
  const rate = (k === "throw" ? PASS.turnRate : MOVE.turnRate) * dt;
  a.yaw += clamp(angleDiff(a.yaw, want), -rate, rate);
}
