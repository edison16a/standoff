import { BOARD, RIM } from "../tuning";
import { clamp, type V3 } from "../vec";
import type { BallBody } from "./air";
import { BALL, FLOOR, GLASS, IRON, PAD, REST_SPEED, ROLLING, restitution, type Surface } from "./ball-spec";
import { bounce } from "./contact";

/**
 * The hard things the ball meets: the floor, the ring as a torus (a
 * steel tube bent round the circle, so the ball meets it on top, on the
 * inside or on the front edge exactly where it would), the bracket that
 * holds the ring to the glass, and the glass in its padded frame. Each
 * pushes the ball out and applies a contact with spin and friction.
 */

export type SurfaceKind = "floor" | "rim" | "board";

export interface Touch {
  kind: SurfaceKind;
  /** Speed into the surface, metres a second. */
  power: number;
  /** Where on the ball's skin it touched, for the sounds and the net. */
  at: V3;
}

const TOUCH = BALL.radius + RIM.tube;
/** The bracket: a steel plate from the glass to the back of the ring, just under it. */
const BRACKET = { halfX: 0.07, bottom: RIM.y - 0.05, top: RIM.y - 0.006, back: BOARD.face, front: RIM.z - RIM.radius } as const;
const n = { x: 0, y: 0, z: 0 };

export function floorContact(b: BallBody, h: number, out: Touch[]): void {
  const { pos, vel, w } = b;
  if (pos.y > BALL.radius) return;
  pos.y = BALL.radius;
  n.x = 0;
  n.y = 1;
  n.z = 0;
  const impact = -vel.y;
  if (impact > REST_SPEED) {
    const hit = bounce(vel, w, n, restitution(FLOOR, impact), FLOOR.mu);
    if (hit) out.push({ kind: "floor", power: impact, at: { x: pos.x, y: 0, z: pos.z } });
    return;
  }
  // Resting on the floor: the weight presses it down, so friction keeps working until it rolls clean.
  vel.y = Math.max(0, vel.y);
  bounce(vel, w, n, 0, FLOOR.mu, undefined, BALL.gravity * h);
  // Rolling resistance and the pivot friction that stops a spin on the spot.
  const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
  if (speed > 1e-6) {
    const slow = Math.min(speed, (ROLLING * BALL.gravity * h) / (1 + BALL.inertia));
    vel.x -= (vel.x / speed) * slow;
    vel.z -= (vel.z / speed) * slow;
    w.x = vel.z / BALL.radius;
    w.z = -vel.x / BALL.radius;
  }
  w.y *= Math.exp(-4 * h);
}

/** The nearest point on the ring's centre circle, and the ball kept a tube and a ball away from it. */
export function rimContact(b: BallBody, h: number, out: Touch[]): void {
  const { pos, vel, w } = b;
  const hx = pos.x - RIM.x;
  const hz = pos.z - RIM.z;
  const hl = Math.sqrt(hx * hx + hz * hz);
  if (hl < 1e-6 || Math.abs(pos.y - RIM.y) > TOUCH || Math.abs(hl - RIM.radius) > TOUCH) return;
  const qx = RIM.x + (hx / hl) * RIM.radius;
  const qz = RIM.z + (hz / hl) * RIM.radius;
  const dx = pos.x - qx;
  const dy = pos.y - RIM.y;
  const dz = pos.z - qz;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d >= TOUCH || d < 1e-6) return;
  n.x = dx / d;
  n.y = dy / d;
  n.z = dz / d;
  pos.x = qx + n.x * TOUCH;
  pos.y = RIM.y + n.y * TOUCH;
  pos.z = qz + n.z * TOUCH;
  const impact = -(vel.x * n.x + vel.y * n.y + vel.z * n.z);
  // A ball sitting on the iron is held up by it, so it can roll round the ring rather than slide off.
  const hit = bounce(vel, w, n, impact > 0.25 ? restitution(IRON, impact) : 0, IRON.mu, undefined, n.y > 0.3 ? BALL.gravity * n.y * h : 0);
  if (hit && impact > 0.05) out.push({ kind: "rim", power: impact, at: { x: qx, y: RIM.y, z: qz } });
}

function boxContact(b: BallBody, lo: V3, hi: V3, surface: (p: V3) => Surface, kind: SurfaceKind, out: Touch[]): void {
  const { pos, vel, w } = b;
  const cx = clamp(pos.x, lo.x, hi.x);
  const cy = clamp(pos.y, lo.y, hi.y);
  const cz = clamp(pos.z, lo.z, hi.z);
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  const dz = pos.z - cz;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d >= BALL.radius || d < 1e-9) return;
  n.x = dx / d;
  n.y = dy / d;
  n.z = dz / d;
  pos.x = cx + n.x * BALL.radius;
  pos.y = cy + n.y * BALL.radius;
  pos.z = cz + n.z * BALL.radius;
  const impact = -(vel.x * n.x + vel.y * n.y + vel.z * n.z);
  const at = { x: cx, y: cy, z: cz };
  const s = surface(at);
  const hit = bounce(vel, w, n, restitution(s, impact), s.mu);
  if (hit && impact > 0.05) out.push({ kind, power: impact, at });
}

const BOARD_LO = { x: RIM.x - BOARD.halfWidth, y: BOARD.bottom, z: BOARD.face - BOARD.thickness };
const BOARD_HI = { x: RIM.x + BOARD.halfWidth, y: BOARD.top, z: BOARD.face };
const BRACKET_LO = { x: RIM.x - BRACKET.halfX, y: BRACKET.bottom, z: BRACKET.back };
const BRACKET_HI = { x: RIM.x + BRACKET.halfX, y: BRACKET.top, z: BRACKET.front };
/** The bottom edge of the board is padded. */
const boardSurface = (p: V3): Surface => (p.y < BOARD.bottom + 0.015 ? PAD : GLASS);

export function boardContact(b: BallBody, out: Touch[]): void {
  // Only near the glass is there anything to test.
  if (b.pos.z > BOARD.face + BALL.radius || b.pos.y < BOARD.bottom - BALL.radius) return;
  boxContact(b, BOARD_LO, BOARD_HI, boardSurface, "board", out);
}

export function bracketContact(b: BallBody, out: Touch[]): void {
  if (b.pos.z > BRACKET.front + BALL.radius || Math.abs(b.pos.y - RIM.y) > 0.25) return;
  boxContact(b, BRACKET_LO, BRACKET_HI, () => IRON, "rim", out);
}
