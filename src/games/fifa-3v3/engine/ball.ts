import type { TeamId } from "../teams";
import { BALL, PITCH } from "./tuning";
import type { Ball } from "./types";
import type { Vec3 } from "./vec";

export type Contact =
  | { type: "bounce"; speed: number }
  | { type: "board"; speed: number; at: Vec3 }
  | { type: "post" | "bar"; speed: number; at: Vec3 }
  | { type: "net"; team: TeamId; speed: number; at: Vec3 };

/** Which physics to run. A shot being planned flies free of walls and woodwork. */
export interface StepOptions {
  flightOnly?: boolean;
}

const R = BALL.radius;
const HL = PITCH.halfLength;
const HW = PITCH.halfWidth;
const GW = PITCH.goalHalfWidth;
const GH = PITCH.goalHeight;
const PR = PITCH.postRadius;

/**
 * Moves a loose ball through one step: gravity, drag and swerve in the
 * air, bounces and rolling on the turf, and every surface it can hit.
 * It runs in small substeps so a hard shot cannot pass through a post.
 * Contacts are pushed to `contacts` for the sounds and the match rules.
 */
export function stepBall(ball: Ball, dt: number, contacts: Contact[] = [], options: StepOptions = {}): void {
  const h = dt / BALL.substeps;
  for (let i = 0; i < BALL.substeps; i++) substep(ball, h, contacts, options);
}

function substep(ball: Ball, h: number, contacts: Contact[], options: StepOptions): void {
  const p = ball.pos;
  const v = ball.vel;
  const w = ball.spin;
  const airborne = p.y > R + 0.002 || v.y > 0.05;
  if (airborne) {
    const speed = Math.hypot(v.x, v.y, v.z);
    const drag = BALL.drag * speed;
    // Spin crossed with velocity: sidespin bends the ball left or right.
    const mx = w.y * v.z - w.z * v.y;
    const my = w.z * v.x - w.x * v.z;
    const mz = w.x * v.y - w.y * v.x;
    v.x += (-drag * v.x + BALL.magnus * mx) * h;
    v.y += (-drag * v.y + BALL.magnus * my - BALL.gravity) * h;
    v.z += (-drag * v.z + BALL.magnus * mz) * h;
  } else {
    const s = Math.hypot(v.x, v.z);
    if (s > 0) {
      const next = Math.max(0, s - BALL.roll * h);
      v.x *= next / s;
      v.z *= next / s;
    }
  }
  // Spin fades, faster once the ball is rolling on the turf.
  const fade = 1 - (airborne ? 0.25 : 2.5) * h;
  w.x *= fade;
  w.y *= fade;
  w.z *= fade;
  p.x += v.x * h;
  p.y += v.y * h;
  p.z += v.z * h;

  if (p.y < R) {
    p.y = R;
    if (v.y < -0.9) {
      contacts.push({ type: "bounce", speed: -v.y });
      v.y = -v.y * BALL.bounce;
      // The turf grabs the ball a little on each bounce.
      v.x *= 0.9;
      v.z *= 0.9;
    } else v.y = 0;
  }
  if (options.flightOnly) return;
  // Woodwork first: the end boards start right beside the posts.
  woodwork(ball, contacts);
  sides(ball, contacts);
  ends(ball, contacts);
  net(ball, contacts);
}

/** The side boards, with a cage net above them, so the ball never leaves along the sides. */
function sides(ball: Ball, contacts: Contact[]): void {
  const p = ball.pos;
  const v = ball.vel;
  if (Math.abs(p.z) < HW - R) return;
  const side = Math.sign(p.z);
  p.z = side * (HW - R);
  if (v.z * side <= 0) return;
  const low = p.y < PITCH.boardHeight;
  contacts.push({ type: "board", speed: Math.abs(v.z), at: { ...p } });
  v.z = -v.z * (low ? BALL.boardBounce : BALL.netBounce);
  v.x *= low ? 0.9 : 0.6;
}

/**
 * The end boards either side of the goal. Above them the ball flies out
 * for a goal kick, into the tall catch net that stops it.
 */
function ends(ball: Ball, contacts: Contact[]): void {
  const p = ball.pos;
  const v = ball.vel;
  const end = Math.sign(p.x);
  const depth = Math.abs(p.x);
  const inMouth = Math.abs(p.z) < GW - PR && p.y < GH;
  if (depth > HL - R && depth < HL + 0.4 && !inMouth && p.y < PITCH.boardHeight && v.x * end > 0 && Math.abs(p.z) > GW + PR) {
    p.x = end * (HL - R);
    contacts.push({ type: "board", speed: Math.abs(v.x), at: { ...p } });
    v.x = -v.x * BALL.boardBounce;
    v.z *= 0.9;
  }
  const stop = HL + PITCH.catchNet;
  if (depth > stop - R && v.x * end > 0) {
    p.x = end * (stop - R);
    v.x = -v.x * BALL.netBounce;
    v.z *= 0.5;
    v.y *= 0.5;
  }
}

/** Posts and crossbars are cylinders. A hit rings them and bounces the ball off hard. */
function woodwork(ball: Ball, contacts: Contact[]): void {
  const p = ball.pos;
  if (Math.abs(Math.abs(p.x) - HL) > 0.5 || p.y > GH + 0.5) return;
  const end = Math.sign(p.x) || 1;
  const x = end * HL;
  for (const z of [-GW, GW]) {
    // A post runs from the turf up to the bar.
    const cy = Math.max(0, Math.min(GH, p.y));
    hitCylinder(ball, { x, y: cy, z }, "post", contacts);
  }
  const cz = Math.max(-GW, Math.min(GW, p.z));
  hitCylinder(ball, { x, y: GH, z: cz }, "bar", contacts);
}

function hitCylinder(ball: Ball, c: Vec3, part: "post" | "bar", contacts: Contact[]): void {
  const p = ball.pos;
  const v = ball.vel;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const dz = p.z - c.z;
  const d = Math.hypot(dx, dy, dz);
  const min = R + PR;
  if (d >= min || d < 1e-6) return;
  const nx = dx / d;
  const ny = dy / d;
  const nz = dz / d;
  p.x = c.x + nx * min;
  p.y = c.y + ny * min;
  p.z = c.z + nz * min;
  const vn = v.x * nx + v.y * ny + v.z * nz;
  if (vn >= 0) return;
  contacts.push({ type: part, speed: -vn, at: { ...c } });
  const push = (1 + BALL.postBounce) * vn;
  v.x = (v.x - push * nx) * 0.95;
  v.y = (v.y - push * ny) * 0.95;
  v.z = (v.z - push * nz) * 0.95;
  ball.spin.y *= -0.5;
}

/** Inside a goal the net soaks the ball up: side nets, the roof and the back. */
function net(ball: Ball, contacts: Contact[]): void {
  const p = ball.pos;
  const v = ball.vel;
  const depth = Math.abs(p.x);
  if (depth < HL + R * 0.5 || depth > HL + PITCH.goalDepth + 0.3) return;
  const inside = Math.abs(p.z) < GW + 0.05 && p.y < GH + 0.05;
  if (!inside) return;
  const end = Math.sign(p.x);
  const team: TeamId = end < 0 ? 0 : 1;
  const soak = (speed: number) => contacts.push({ type: "net", team, speed, at: { ...p } });
  const back = HL + PITCH.goalDepth - R;
  if (depth > back && v.x * end > 0) {
    soak(Math.abs(v.x));
    p.x = end * back;
    v.x = -v.x * BALL.netBounce;
    v.y *= 0.4;
    v.z *= 0.4;
  }
  if (Math.abs(p.z) > GW - PR - R && v.z * p.z > 0) {
    soak(Math.abs(v.z));
    p.z = Math.sign(p.z) * (GW - PR - R);
    v.z = -v.z * BALL.netBounce;
    v.x *= 0.5;
  }
  if (p.y > GH - R && v.y > 0) {
    soak(v.y);
    p.y = GH - R;
    v.y = -v.y * BALL.netBounce;
    v.x *= 0.5;
  }
}

/** A fresh ball on the centre spot. */
export function newBall(): Ball {
  return {
    pos: { x: 0, y: R, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    spin: { x: 0, y: 0, z: 0 },
    owner: null,
    lastTouch: null,
    inGoal: null,
    passTo: null,
    heldFor: 0,
  };
}

export function ballSpeed(ball: Ball): number {
  return Math.hypot(ball.vel.x, ball.vel.y, ball.vel.z);
}

/** A copy for simulating ahead without touching the real ball. */
export function cloneBall(ball: Ball): Ball {
  return { ...ball, pos: { ...ball.pos }, vel: { ...ball.vel }, spin: { ...ball.spin } };
}
