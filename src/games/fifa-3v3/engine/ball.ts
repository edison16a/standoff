import type { TeamId } from "../teams";
import { airAccel, decaySpin } from "./physics/aero";
import { hitCapsule, type Capsule } from "./physics/capsule";
import { AIR, BALL_BODY, SUBSTEPS } from "./physics/constants";
import { stepNets, type Nets } from "./physics/net";
import { landOnTurf, onTurf, rollOnTurf } from "./physics/turf";
import { endWalls, sideWalls } from "./physics/walls";
import { hitWoodwork } from "./physics/woodwork";
import { STEP } from "./tuning";
import type { Ball } from "./types";
import type { Vec3 } from "./vec";

export type ColliderKind = "body" | "head" | "glove" | "boot";

/** Something solid in the ball's way for one match step: a body, a head, a keeper's glove, a sliding boot. */
export interface BallCollider {
  id: number;
  kind: ColliderKind;
  shape: Capsule;
  /** How the part is moving, which the ball takes on when it hits it. */
  vel: Vec3;
  restitution: number;
  friction: number;
  /** A keeper's gloves hold a ball meeting their palms slower than this, m/s, instead of palming it away. */
  grip?: number;
}

export type Contact =
  | { type: "bounce"; speed: number; at: Vec3 }
  | { type: "board"; speed: number; at: Vec3 }
  | { type: "post" | "bar"; speed: number; at: Vec3 }
  | { type: "net"; team: TeamId; speed: number; at: Vec3 }
  | { type: "body"; id: number; kind: ColliderKind; speed: number; at: Vec3; caught: boolean };

/** What the ball can meet. A trial flight for aiming meets nothing but the air and the turf. */
export interface StepOptions {
  flightOnly?: boolean;
  /** The goal nets. They keep their own motion, so the match passes the same ones every step. */
  nets?: Nets;
  colliders?: readonly BallCollider[];
}

const R = BALL_BODY.radius;
const H = STEP / SUBSTEPS;
const acc: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Moves a loose ball through one match step in small fixed substeps:
 * gravity, drag with its crisis, Magnus lift and the knuckle's swim in
 * the air; skidding, rolling and bounces on the turf; and every surface
 * it can hit. The substeps are fixed in length, so a step of any size
 * plays the same way every time. Contacts go to `contacts` for the
 * sounds and the rules.
 */
export function stepBall(ball: Ball, dt: number, contacts: Contact[] = [], options: StepOptions = {}): void {
  const n = Math.max(1, Math.round(dt / H));
  const h = dt / n;
  for (let i = 0; i < n; i++) if (substep(ball, h, i * h, contacts, options)) return;
}

/** One substep. Returns true when a keeper's gloves held the ball, which ends its flight. */
function substep(ball: Ball, h: number, elapsed: number, contacts: Contact[], options: StepOptions): boolean {
  const p = ball.pos;
  const v = ball.vel;
  airAccel(ball, acc);
  if (onTurf(ball)) {
    v.x += acc.x * h;
    v.z += acc.z * h;
    // Backspin strong enough to beat gravity lifts a ball off the grass.
    if (acc.y > AIR.gravity) v.y += (acc.y - AIR.gravity) * h;
    else rollOnTurf(ball, h);
  } else {
    v.x += acc.x * h;
    v.y += (acc.y - AIR.gravity) * h;
    v.z += acc.z * h;
    decaySpin(ball, h);
  }
  p.x += v.x * h;
  p.y += v.y * h;
  p.z += v.z * h;
  ball.travel += Math.hypot(v.x, v.y, v.z) * h;
  if (p.y < R) {
    const speed = landOnTurf(ball);
    if (speed > 0) contacts.push({ type: "bounce", speed, at: { ...p } });
  }
  if (options.flightOnly) return false;
  const frame = hitWoodwork(ball);
  if (frame) contacts.push({ type: frame.part, speed: frame.speed, at: frame.at });
  for (const wall of [sideWalls(ball), endWalls(ball)]) if (wall) contacts.push({ type: "board", speed: wall.speed, at: wall.at });
  if (options.nets) {
    const struck = stepNets(options.nets, ball, h);
    if (struck > 0) contacts.push({ type: "net", team: p.x < 0 ? 0 : 1, speed: struck, at: { ...p } });
  }
  for (const c of options.colliders ?? []) {
    // The part has moved on since the start of the match step.
    const shift = (q: Vec3) => ({ x: q.x + c.vel.x * elapsed, y: q.y + c.vel.y * elapsed, z: q.z + c.vel.z * elapsed });
    const shape = { a: shift(c.shape.a), b: shift(c.shape.b), radius: c.shape.radius };
    const along = alongRod(shape, p);
    const speed = hitCapsule(ball, shape, c.restitution, c.friction, c.vel);
    if (speed <= 0) continue;
    // Taken cleanly in the palms rather than off the fingertips: held.
    const caught = c.grip !== undefined && speed <= c.grip && along > 0.1 && along < 0.8;
    contacts.push({ type: "body", id: c.id, kind: c.kind, speed, at: { ...p }, caught });
    if (caught) {
      ball.vel = { x: 0, y: 0, z: 0 };
      ball.spin = { x: 0, y: 0, z: 0 };
      return true;
    }
  }
  return false;
}

/** How far along a rod, 0 to 1, the point nearest `p` lies. */
function alongRod(c: Capsule, p: Vec3): number {
  const ax = c.b.x - c.a.x;
  const ay = c.b.y - c.a.y;
  const az = c.b.z - c.a.z;
  const len2 = ax * ax + ay * ay + az * az;
  return len2 > 1e-12 ? ((p.x - c.a.x) * ax + (p.y - c.a.y) * ay + (p.z - c.a.z) * az) / len2 : 0.5;
}

/** Moves the nets on when nothing touches them, such as while a keeper holds the ball. */
export function settleNets(nets: Nets, dt: number): void {
  const n = Math.max(1, Math.round(dt / H));
  for (let i = 0; i < n; i++) stepNets(nets, null, dt / n);
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
    wobble: 0,
    travel: 0,
    struckAt: -10,
  };
}

export function ballSpeed(ball: Ball): number {
  return Math.hypot(ball.vel.x, ball.vel.y, ball.vel.z);
}

/** A copy for simulating ahead without touching the real ball. */
export function cloneBall(ball: Ball): Ball {
  return { ...ball, pos: { ...ball.pos }, vel: { ...ball.vel }, spin: { ...ball.spin } };
}
