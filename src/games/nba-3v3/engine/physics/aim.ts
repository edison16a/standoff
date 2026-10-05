import { BOARD } from "../tuning";
import type { V3 } from "../vec";
import { airStep, type BallBody } from "./air";
import { BALL } from "./ball-spec";

/** Aiming flies the throw in steps twice the live size: the path differs by well under a millimetre, at half the cost. */
export const AIM_STEP = 1 / 240;

/**
 * Aiming a throw through the real air. The shooter or passer picks the
 * plain arc through gravity alone, flies it with drag and spin, sees
 * where it really crosses, and corrects the aim by the miss, a few
 * times over: the way a player's touch learns how the ball carries.
 */

/** The glass the ball's centre can touch: one radius off the face. */
export const GLASS_Z = BOARD.face + BALL.radius;

/** The arc through gravity alone from `p` to `t` that peaks at `apex` (raised when an end is higher). */
export function ballistic(p: V3, t: V3, apex: number): V3 {
  const g = BALL.gravity;
  const top = Math.max(apex, p.y + 0.04, t.y + 0.04);
  const vy = Math.sqrt(2 * g * (top - p.y));
  const dur = vy / g + Math.sqrt((2 * (top - t.y)) / g);
  return { x: (t.x - p.x) / dur, y: vy, z: (t.z - p.z) / dur };
}

/** Where a free flight crosses the plane y = level coming down, or z = level coming in. */
export function crossing(from: V3, v: V3, spin: V3, across: "y" | "z", level: number, maxT = 4): V3 | null {
  const b: BallBody = { pos: { ...from }, vel: { ...v }, w: { ...spin } };
  const { pos } = b;
  for (let t = 0; t < maxT; t += AIM_STEP) {
    const before = across === "y" ? pos.y - level : pos.z - level;
    const px = pos.x;
    const py = pos.y;
    const pz = pos.z;
    airStep(b, AIM_STEP);
    const after = across === "y" ? pos.y - level : pos.z - level;
    if (before > 0 && after <= 0 && (across === "z" || b.vel.y < 0)) {
      const u = before / (before - after);
      return { x: px + (pos.x - px) * u, y: py + (pos.y - py) * u, z: pz + (pos.z - pz) * u };
    }
  }
  return null;
}

/**
 * The launch velocity that carries the ball from `from` through
 * `target` with drag and spin, peaking near `apex`. `across` says which
 * plane the target lies in: the rim plane (y), met coming down, or the
 * face of the glass (z), met coming in.
 */
export function aimThrough(from: V3, target: V3, apex: number, spin: V3, across: "y" | "z" = "y"): V3 {
  const aim = { ...target };
  let v = ballistic(from, aim, apex);
  for (let i = 0; i < 6; i++) {
    const hit = crossing(from, v, spin, across, across === "y" ? target.y : target.z);
    if (!hit) break;
    const ex = target.x - hit.x;
    const ey = across === "z" ? target.y - hit.y : 0;
    const ez = across === "y" ? target.z - hit.z : 0;
    if (Math.hypot(ex, ey, ez) < 0.002) break;
    aim.x += ex;
    aim.y += ey;
    aim.z += ez;
    v = ballistic(from, aim, apex);
  }
  return v;
}

/** The launch velocity that puts the ball at `to` exactly `dur` seconds later, through the air with this spin. */
export function aimTimed(from: V3, to: V3, dur: number, spin: V3): V3 {
  const g = BALL.gravity;
  const v = { x: (to.x - from.x) / dur, y: (to.y - from.y + 0.5 * g * dur * dur) / dur, z: (to.z - from.z) / dur };
  for (let i = 0; i < 4; i++) {
    const b: BallBody = { pos: { ...from }, vel: { ...v }, w: { ...spin } };
    const steps = Math.max(1, Math.round(dur / AIM_STEP));
    for (let k = 0; k < steps; k++) airStep(b, dur / steps);
    const ex = to.x - b.pos.x;
    const ey = to.y - b.pos.y;
    const ez = to.z - b.pos.z;
    if (Math.hypot(ex, ey, ez) < 0.003) break;
    v.x += ex / dur;
    v.y += ey / dur;
    v.z += ez / dur;
  }
  return v;
}

/** Backspin about the axis across the line from `from` toward `to`: the top of the ball turns back toward the thrower. */
export function backspin(from: V3, to: V3, rate: number, side = 0): V3 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const d = Math.hypot(dx, dz) || 1;
  return { x: (-dz / d) * rate, y: side, z: (dx / d) * rate };
}
