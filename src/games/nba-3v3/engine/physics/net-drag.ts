import { RIM } from "../tuning";
import type { BallBody } from "./air";
import { BALL } from "./ball-spec";

/**
 * What the net does to the ball. The cords hang from the ring in a
 * cone that narrows to the bottom loop, a little wider than the ball.
 * A ball going through brushes the cords, which soak up speed and spin
 * (the swish), and one off centre rides the cone and is squeezed back
 * to the middle with friction. A ball falling past outside brushes it
 * too. The cords are drawn as cloth by the renderer.
 */

export const NET = {
  /** How far the net hangs below the ring. */
  depth: 0.42,
  /** The cone's radius at the top, just inside the ring, and at the bottom loop. */
  top: RIM.radius - 0.012,
  bottom: 0.142,
  /** Cords brushing the ball take this share of its speed each second. */
  brush: 6,
  /** Friction of the cords on the leather, and how lively the net is when pushed out. */
  mu: 0.45,
  give: 0.15,
  spin: 9,
} as const;

/** The cone's radius at height y, or -1 outside the net's height. */
export function netRadius(y: number): number {
  const u = (RIM.y - RIM.tube - y) / NET.depth;
  if (u < 0 || u > 1) return -1;
  return NET.top + (NET.bottom - NET.top) * u;
}

/** Applies the net for one small step. Returns true while the ball is touching the cords. */
export function netStep(b: BallBody, h: number): boolean {
  const { pos, vel, w } = b;
  const wall = netRadius(pos.y);
  if (wall < 0) return false;
  const hx = pos.x - RIM.x;
  const hz = pos.z - RIM.z;
  const hl = Math.hypot(hx, hz);
  const inside = hl < wall;
  // Outside the cone and clear of it, or inside and clear of the cords: nothing touches.
  const gap = inside ? wall - hl - BALL.radius : hl - wall - BALL.radius;
  if (!inside && gap > 0.012) return false;
  if (inside) {
    // The cords close round the ball on the way down; it brushes them harder near the wall.
    const keep = Math.exp(-NET.brush * (gap < 0.012 ? 1 : 0.45) * h);
    vel.x *= keep;
    vel.y *= keep;
    vel.z *= keep;
    const spin = Math.exp(-NET.spin * h);
    w.x *= spin;
    w.y *= spin;
    w.z *= spin;
  }
  if (gap >= 0 || hl < 1e-6) return true;
  // The cords push back: out of the cone wall toward the middle, or away from it outside.
  const sign = inside ? -1 : 1;
  const nx = (sign * hx) / hl;
  const nz = (sign * hz) / hl;
  pos.x -= nx * gap;
  pos.z -= nz * gap;
  const into = vel.x * nx + vel.z * nz;
  if (into < 0) {
    const push = -(1 + NET.give) * into;
    vel.x += push * nx;
    vel.z += push * nz;
    // Friction on the cords against the slide along them, mostly the fall.
    const slow = Math.min(1, (NET.mu * push) / Math.max(1e-6, Math.abs(vel.y)));
    vel.y *= 1 - slow;
  }
  return true;
}
