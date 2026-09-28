import { bounce, rimRestitution } from "./contact";
import { BALL, BOARD, NET, RIM } from "./tuning";
import { clamp, type V3 } from "./vec";

/**
 * A free ball under real physics: gravity, air drag and the lift of its
 * spin, and bounces off the floor, the glass and the iron that trade
 * sliding for spin (see `contact.ts`). The rim is a torus, a tube bent
 * round the ring, so the ball meets it wherever it really would. Every
 * shot is flown on this same physics, so the iron and the glass behave
 * the same in a shot and in a scramble after it.
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
  /** Angular velocity, radians per second about each axis. Left out, the ball has no spin. */
  w?: V3;
}

/** Small steps: a ball at game speeds could skip clean through the thin rim in a single frame. */
const SUBSTEPS = 6;
const TOUCH = BALL.radius + RIM.tube;
const n = { x: 0, y: 0, z: 0 };

export function stepLoose(b: Body, dt: number, contacts: Contact[]): void {
  b.w ??= { x: 0, y: 0, z: 0 };
  // Only near the hoop is there thin iron to skip through; out in the open two steps a frame are plenty.
  const p = b.pos;
  const near = p.y > 2 && Math.abs(p.x - RIM.x) < 1.6 && p.z < RIM.z + 1.6;
  const n = near ? SUBSTEPS : 2;
  const h = dt / n;
  for (let i = 0; i < n; i++) substep(b, b.w, h, contacts);
}

function substep(b: Body, w: V3, h: number, contacts: Contact[]): void {
  const { pos, vel } = b;
  const wasAbove = pos.y > RIM.y;
  air(vel, w, h);
  pos.x += vel.x * h;
  pos.y += vel.y * h;
  pos.z += vel.z * h;

  inNet(b, w, h);
  rim(b, w, contacts);
  board(b, w, contacts);
  floor(b, w, h, contacts);

  const fromAxis = Math.hypot(pos.x - RIM.x, pos.z - RIM.z);
  if (wasAbove && pos.y <= RIM.y && vel.y < 0 && fromAxis < RIM.radius - BALL.radius * 0.5) contacts.push({ kind: "through", power: -vel.y });
}

/** Just the flight through the air for `h` seconds, with nothing to hit: for aiming a shot. */
export function airStep(pos: V3, vel: V3, w: V3, h: number): void {
  air(vel, w, h);
  pos.x += vel.x * h;
  pos.y += vel.y * h;
  pos.z += vel.z * h;
}

/** Gravity, drag against the air, and the Magnus lift of the spin, which floats a backspun shot a touch. */
function air(vel: V3, w: V3, h: number): void {
  const speed = Math.hypot(vel.x, vel.y, vel.z);
  const drag = BALL.drag * speed;
  const mx = BALL.magnus * (w.y * vel.z - w.z * vel.y);
  const my = BALL.magnus * (w.z * vel.x - w.x * vel.z);
  const mz = BALL.magnus * (w.x * vel.y - w.y * vel.x);
  vel.x += (mx - drag * vel.x) * h;
  vel.y += (my - drag * vel.y - BALL.gravity) * h;
  vel.z += (mz - drag * vel.z) * h;
}

function floor(b: Body, w: V3, h: number, contacts: Contact[]): void {
  const { pos, vel } = b;
  if (pos.y > BALL.radius) return;
  pos.y = BALL.radius;
  n.x = 0;
  n.y = 1;
  n.z = 0;
  const impact = -vel.y;
  if (impact > 0.35) {
    bounce(vel, w, n, BALL.radius, BALL.floorBounce, BALL.floorGrip);
    if (impact > 0.6) contacts.push({ kind: "floor", power: impact });
    return;
  }
  // Too slow to bounce: it rolls without slipping, losing speed to the floor, and the spin follows the roll.
  vel.y = Math.max(0, vel.y);
  const keep = Math.pow(BALL.rollKeep, h);
  vel.x *= keep;
  vel.z *= keep;
  w.x = vel.z / BALL.radius;
  w.z = -vel.x / BALL.radius;
  w.y *= keep;
}

/** The ring as a torus: the nearest point on the tube's centre circle, and the ball kept a tube and a ball away from it. */
function rim(b: Body, w: V3, contacts: Contact[]): void {
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
  n.x = dx / d;
  n.y = dy / d;
  n.z = dz / d;
  pos.x = qx + n.x * TOUCH;
  pos.y = RIM.y + n.y * TOUCH;
  pos.z = qz + n.z * TOUCH;
  const vn = -(vel.x * n.x + vel.y * n.y + vel.z * n.z);
  const hit = bounce(vel, w, n, BALL.radius, rimRestitution(BALL.rimBounce, vn), BALL.rimGrip);
  if (hit && hit.impact > 0.4) contacts.push({ kind: "rim", power: hit.impact });
}

function board(b: Body, w: V3, contacts: Contact[]): void {
  const { pos, vel } = b;
  const cx = clamp(pos.x, RIM.x - BOARD.halfWidth, RIM.x + BOARD.halfWidth);
  const cy = clamp(pos.y, BOARD.bottom, BOARD.top);
  const cz = clamp(pos.z, BOARD.face - BOARD.thickness, BOARD.face);
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  const dz = pos.z - cz;
  const d = Math.hypot(dx, dy, dz);
  if (d >= BALL.radius || d < 1e-6) return;
  n.x = dx / d;
  n.y = dy / d;
  n.z = dz / d;
  pos.x = cx + n.x * BALL.radius;
  pos.y = cy + n.y * BALL.radius;
  pos.z = cz + n.z * BALL.radius;
  const hit = bounce(vel, w, n, BALL.radius, BALL.boardBounce, BALL.boardGrip);
  if (hit && hit.impact > 0.4) contacts.push({ kind: "board", power: hit.impact });
}

/** Inside the net the cords slow the ball, take its spin, and steer it down the middle. */
function inNet(b: Body, w: V3, h: number): void {
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
  w.x *= keep;
  w.y *= keep;
  w.z *= keep;
  vel.y = Math.max(vel.y, -3.2);
  if (hl > room && hl > 1e-6) {
    pos.x = RIM.x + (hx / hl) * room;
    pos.z = RIM.z + (hz / hl) * room;
  }
}
