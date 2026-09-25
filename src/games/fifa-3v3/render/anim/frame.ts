import type { Build, Foot, Side } from "./leg-ik";
import type { Pose } from "./pose";

/**
 * What a move asks of each foot: a spot to reach, or null to leave the
 * leg to the pose's own joint angles. A planted spot means "stay where
 * you are on the turf" while the body moves over it; the spot itself is
 * where the foot goes if the body leaves it behind.
 */
export type FootPlan = (Foot & { plant?: boolean }) | null;

/** A pose for one moment plus where its feet go. The figure solves the legs. */
export interface Frame {
  pose: Pose;
  left: FootPlan;
  right: FootPlan;
}

/** Local x, y and z in the figure's frame: x to its left, z ahead. */
export interface Local {
  x: number;
  y: number;
  z: number;
}

/** What the body knows about its surroundings, in its own frame. */
export interface Context {
  build: Build;
  /** The kicking foot: right for right footers. */
  lead: Side;
  /** The ball where it is drawn this frame. */
  ball: Local;
  /** Which way the body is actually travelling, unit length on the turf (y unused). */
  move: Local;
}

export const plan = (f: Frame, side: Side): FootPlan => (side === 1 ? f.left : f.right);

export function setPlan(f: Frame, side: Side, p: FootPlan): void {
  if (side === 1) f.left = p;
  else f.right = p;
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
/** 0 up to 1 and back to 0 over v from 0 to 1. */
export const bump = (v: number) => Math.sin(Math.PI * clamp01(v));
/** Rises over [a, b], holds, and falls over [c, d]. */
export const window = (u: number, a: number, b: number, c: number, d: number) => smooth((u - a) / (b - a)) * (1 - smooth((u - c) / (d - c)));

export function mixFoot(a: Foot, b: Foot, t: number): Foot {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, toe: a.toe + (b.toe - a.toe) * t };
}

/**
 * Moves a planned foot toward `to` by `t`, lifting it on the way so a
 * boot reaching for the ball never scrapes along the turf. A foot the
 * pose leaves to its joint angles is left alone until mostly taken over.
 */
export function steer(f: Frame, side: Side, to: Foot, t: number, lift = 0.12): void {
  if (t <= 0) return;
  const cur = plan(f, side);
  if (!cur) {
    if (t >= 0.5) setPlan(f, side, to);
    return;
  }
  // A foot taken off its plant eases over from where it stood (see FootLock).
  const m = mixFoot(cur, to, t);
  const gap = Math.hypot(to.x - cur.x, to.z - cur.z);
  m.y += Math.min(lift, gap * 0.4) * 4 * t * (1 - t);
  setPlan(f, side, m);
}

/** Pins a foot where it stands for now. */
export function plant(f: Frame, side: Side): void {
  const cur = plan(f, side);
  if (cur) setPlan(f, side, { ...cur, plant: true });
}

/** A foot's spot at a moment, for keyed moves. */
export type Key = readonly [number, Foot];

/**
 * A foot's path through its keys: a smooth curve that passes through
 * every key at its time and keeps moving through the middle ones, so a
 * boot is still travelling fast as it meets the ball. It rests at the
 * first and last keys.
 */
export function track(t: number, keys: readonly Key[]): Foot {
  const first = keys[0]!;
  const last = keys[keys.length - 1]!;
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  let i = 0;
  while (t > keys[i + 1]![0]) i++;
  const [t1, p1] = keys[i]!;
  const [t2, p2] = keys[i + 1]!;
  const span = t2 - t1;
  const u = (t - t1) / span;
  const m1 = tangent(keys, i);
  const m2 = tangent(keys, i + 1);
  const h00 = 2 * u ** 3 - 3 * u * u + 1;
  const h10 = u ** 3 - 2 * u * u + u;
  const h01 = -2 * u ** 3 + 3 * u * u;
  const h11 = u ** 3 - u * u;
  const at = (k: keyof Foot) => h00 * p1[k] + h10 * span * m1[k] + h01 * p2[k] + h11 * span * m2[k];
  return { x: at("x"), y: at("y"), z: at("z"), toe: at("toe") };
}

function tangent(keys: readonly Key[], i: number): Foot {
  const prev = keys[i - 1];
  const next = keys[i + 1];
  if (!prev || !next) return { x: 0, y: 0, z: 0, toe: 0 };
  const dt = next[0] - prev[0];
  return { x: (next[1].x - prev[1].x) / dt, y: (next[1].y - prev[1].y) / dt, z: (next[1].z - prev[1].z) / dt, toe: (next[1].toe - prev[1].toe) / dt };
}
