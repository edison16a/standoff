/** Plain 2D helpers for the arena. */

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * How far along a moving blade it first touches a moving circle, from 0
 * to 1, or null if it never does. Both move during the frame, so the test
 * runs in the circle's own frame: the blade goes from a0 to a1 while the
 * centre goes from c0 to c1. That sweep is what stops a fast fruit from
 * slipping between two frames.
 */
export function sweepHit(a0: Vec2, a1: Vec2, c0: Vec2, c1: Vec2, radius: number): number | null {
  const sx = a0.x - c0.x;
  const sy = a0.y - c0.y;
  const dx = a1.x - c1.x - sx;
  const dy = a1.y - c1.y - sy;
  const a = dx * dx + dy * dy;
  const c = sx * sx + sy * sy - radius * radius;
  if (c <= 0) return 0;
  if (a < 1e-12) return null;
  const b = 2 * (sx * dx + sy * dy);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

export function length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
