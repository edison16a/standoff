/**
 * Small helpers for points in the mirrored picture. Picture points run 0
 * to 1 on both axes, but the picture is wider than tall, so every length
 * is measured in frame heights to keep it the same in every direction.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** The distance between two picture points, in frame heights. */
export function span(a: Point, b: Point, aspect: number): number {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

export function distance3(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 0 at or below `from`, 1 at or above `to`, and a straight line between. Works either way round. */
export function ramp(value: number, from: number, to: number): number {
  if (from === to) return value >= to ? 1 : 0;
  return clamp((value - from) / (to - from), 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
