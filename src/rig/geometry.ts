/** 2D points in fencer space: metres, x toward the opponent, y up from the floor. */
export interface Vec2 {
  x: number;
  y: number;
}

export function v2(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function polar(angle: number, length: number): Vec2 {
  return { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
}

export function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export function lerpVec(a: Vec2, b: Vec2, k: number): Vec2 {
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
}

export function angleOf(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * Places the middle joint of a two bone limb (knee or elbow) so the end
 * lands on the target. `bend` picks which side the joint folds to: 1 bends
 * counter clockwise from root to target, -1 clockwise. If the target is out
 * of reach, the limb straightens and points at it.
 */
export function solveTwoBone(root: Vec2, target: Vec2, upper: number, lower: number, bend: 1 | -1) {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const reach = Math.min(upper + lower - 1e-4, Math.max(Math.abs(upper - lower) + 1e-4, Math.hypot(dx, dy)));
  const direction = Math.atan2(dy, dx);
  const cosInner = (upper * upper + reach * reach - lower * lower) / (2 * upper * reach);
  const inner = Math.acos(Math.min(1, Math.max(-1, cosInner)));
  const joint = add(root, polar(direction + bend * inner, upper));
  const end = add(root, polar(direction, reach));
  return { joint, end };
}

/** Eases 0..1 in and out, for pose blends that should not snap. */
export function smoothstep(k: number): number {
  const t = Math.min(1, Math.max(0, k));
  return t * t * (3 - 2 * t);
}
