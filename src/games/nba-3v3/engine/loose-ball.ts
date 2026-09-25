import { BALL, BOARD, NET, RIM } from "./tuning";
import { clamp, type V3 } from "./vec";

/**
 * A loose ball under real physics: gravity, bounces off the floor, the
 * glass and the iron, and a drag through the net. It runs in small sub
 * steps, because at game speeds a ball could skip clean through the thin
 * rim in a single frame.
 */

export type ContactKind = "floor" | "rim" | "board" | "through";

export interface Contact {
  kind: ContactKind;
  /** How hard, in metres per second into the surface. */
  power: number;
}

export interface Body {
  pos: V3;
  vel: V3;
}

const SUBSTEPS = 4;
const TOUCH = BALL.radius + RIM.tube;

export function stepLoose(b: Body, dt: number, contacts: Contact[]): void {
  const h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) substep(b, h, contacts);
}

function substep(b: Body, h: number, contacts: Contact[]): void {
  const { pos, vel } = b;
  const wasAbove = pos.y > RIM.y;
  vel.y -= BALL.gravity * h;
  pos.x += vel.x * h;
  pos.y += vel.y * h;
  pos.z += vel.z * h;

  inNet(b, h);
  rim(b, contacts);
  board(b, contacts);
  floor(b, h, contacts);

  const fromAxis = Math.hypot(pos.x - RIM.x, pos.z - RIM.z);
  if (wasAbove && pos.y <= RIM.y && vel.y < 0 && fromAxis < RIM.radius - BALL.radius * 0.5) contacts.push({ kind: "through", power: -vel.y });
}

function floor(b: Body, h: number, contacts: Contact[]): void {
  const { pos, vel } = b;
  if (pos.y > BALL.radius) return;
  pos.y = BALL.radius;
  if (vel.y >= 0) return;
  const impact = -vel.y;
  if (impact > 0.35) {
    vel.y = impact * BALL.floorBounce;
    vel.x *= 0.88;
    vel.z *= 0.88;
    if (impact > 0.6) contacts.push({ kind: "floor", power: impact });
  } else {
    // Too slow to bounce: it rolls, losing speed to the floor.
    vel.y = 0;
    const keep = Math.pow(BALL.rollKeep, h);
    vel.x *= keep;
    vel.z *= keep;
  }
}

function rim(b: Body, contacts: Contact[]): void {
  const { pos, vel } = b;
  const hx = pos.x - RIM.x;
  const hz = pos.z - RIM.z;
  const hl = Math.hypot(hx, hz);
  if (hl < 1e-6) return;
  const qx = RIM.x + (hx / hl) * RIM.radius;
  const qz = RIM.z + (hz / hl) * RIM.radius;
  const dx = pos.x - qx;
  const dy = pos.y - RIM.y;
  const dz = pos.z - qz;
  const d = Math.hypot(dx, dy, dz);
  if (d >= TOUCH || d < 1e-6) return;
  const nx = dx / d;
  const ny = dy / d;
  const nz = dz / d;
  pos.x = qx + nx * TOUCH;
  pos.y = RIM.y + ny * TOUCH;
  pos.z = qz + nz * TOUCH;
  const vn = vel.x * nx + vel.y * ny + vel.z * nz;
  if (vn >= 0) return;
  const push = (1 + BALL.rimBounce) * vn;
  vel.x = (vel.x - push * nx) * 0.94;
  vel.y = (vel.y - push * ny) * 0.94;
  vel.z = (vel.z - push * nz) * 0.94;
  if (-vn > 0.4) contacts.push({ kind: "rim", power: -vn });
}

function board(b: Body, contacts: Contact[]): void {
  const { pos, vel } = b;
  const cx = clamp(pos.x, RIM.x - BOARD.halfWidth, RIM.x + BOARD.halfWidth);
  const cy = clamp(pos.y, BOARD.bottom, BOARD.top);
  const cz = clamp(pos.z, BOARD.face - BOARD.thickness, BOARD.face);
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  const dz = pos.z - cz;
  const d = Math.hypot(dx, dy, dz);
  if (d >= BALL.radius || d < 1e-6) return;
  const nx = dx / d;
  const ny = dy / d;
  const nz = dz / d;
  pos.x = cx + nx * BALL.radius;
  pos.y = cy + ny * BALL.radius;
  pos.z = cz + nz * BALL.radius;
  const vn = vel.x * nx + vel.y * ny + vel.z * nz;
  if (vn >= 0) return;
  const push = (1 + BALL.boardBounce) * vn;
  vel.x -= push * nx;
  vel.y -= push * ny;
  vel.z -= push * nz;
  if (-vn > 0.4) contacts.push({ kind: "board", power: -vn });
}

/** Inside the net the cords slow the ball and steer it down the middle. */
function inNet(b: Body, h: number): void {
  const { pos, vel } = b;
  if (pos.y > RIM.y || pos.y < RIM.y - NET.depth) return;
  const hx = pos.x - RIM.x;
  const hz = pos.z - RIM.z;
  const hl = Math.hypot(hx, hz);
  // Only a ball that came down through the ring is inside the net; one falling past it stays outside.
  if (hl > RIM.radius - BALL.radius * 0.4) return;
  const depth = (RIM.y - pos.y) / NET.depth;
  const room = RIM.radius * (1 - depth * 0.35) - BALL.radius * 0.6;
  const keep = Math.pow(0.08, h);
  vel.x *= keep;
  vel.z *= keep;
  vel.y = Math.max(vel.y, -3.2);
  if (hl > room && hl > 1e-6) {
    pos.x = RIM.x + (hx / hl) * room;
    pos.z = RIM.z + (hz / hl) * room;
  }
}
