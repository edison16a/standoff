import { POSTS } from "../field";
import type { V3 } from "../vec";
import { extent, support } from "./ball-shape";
import { collide } from "./contact";
import type { TurfBody } from "./turf";

/**
 * The solid parts of the goal posts and the kicking net behind them.
 * The uprights and crossbar are padded steel tubes: a ball that clips
 * one bounces off it (a doink) and may still go through. The net hangs
 * on two poles behind each end line and swallows a kick that clears.
 */
export const GOAL = {
  uprightRadius: 0.07,
  barRadius: 0.09,
  steel: { restitution: 0.55, friction: 0.25 },
  /** The net: how far behind the posts, how wide either side and how high it hangs. */
  net: { behind: 4, halfWidth: 9, bottom: 2.5, top: 14, restitution: 0.08, friction: 0.9 },
} as const;

export type GoalPart = "upright" | "crossbar" | "net";

export interface GoalHit {
  part: GoalPart;
  /** Which end: +1 the +x end. */
  side: 1 | -1;
  impulse: number;
  /** Where on the ball's path it hit, for the posts to shake and the net to bulge there. */
  point: V3;
}

const STILL: V3 = { x: 0, y: 0, z: 0 };

/** Nearest point to p on the segment a to b. */
function nearest(p: V3, a: V3, b: V3): V3 {
  const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const l2 = d.x * d.x + d.y * d.y + d.z * d.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * d.x + (p.y - a.y) * d.y + (p.z - a.z) * d.z) / l2));
  return { x: a.x + d.x * t, y: a.y + d.y * t, z: a.z + d.z * t };
}

/** A tube from a to b: pushes the ball out of it and bounces it off. */
function tube(b: TurfBody, a: V3, c: V3, radius: number): number {
  const p = nearest(b.pos, a, c);
  const d = { x: b.pos.x - p.x, y: b.pos.y - p.y, z: b.pos.z - p.z };
  const dist = Math.hypot(d.x, d.y, d.z);
  if (dist < 1e-6 || dist > radius + 0.15) return 0;
  const n = { x: d.x / dist, y: d.y / dist, z: d.z / dist };
  const gap = dist - radius - extent(b.q, n);
  if (gap >= 0) return 0;
  b.pos.x -= n.x * gap;
  b.pos.y -= n.y * gap;
  b.pos.z -= n.z * gap;
  const r = support(b.q, { x: -n.x, y: -n.y, z: -n.z });
  return collide(b, r, { n, vel: STILL, ...GOAL.steel });
}

/** The net: a soft wall that takes nearly all the pace off the ball. */
function net(b: TurfBody, side: 1 | -1): number {
  const N = GOAL.net;
  const x = side * (POSTS.x + N.behind);
  if (Math.abs(b.pos.z) > N.halfWidth || b.pos.y < N.bottom || b.pos.y > N.top) return 0;
  const out: V3 = { x: side, y: 0, z: 0 };
  const reach = side * b.pos.x + extent(b.q, out) - side * x;
  if (reach <= 0 || reach > 0.6) return 0;
  b.pos.x -= side * reach;
  const r = support(b.q, out);
  return collide(b, r, { n: { x: -side, y: 0, z: 0 }, vel: STILL, restitution: N.restitution, friction: N.friction });
}

/** Checks the ball against the posts and the net at whichever end it is near. */
export function touchGoal(b: TurfBody): GoalHit | null {
  if (Math.abs(b.pos.x) < POSTS.x - 1) return null;
  const side: 1 | -1 = b.pos.x > 0 ? 1 : -1;
  const x = side * POSTS.x;
  const at = { ...b.pos };
  const g = POSTS.halfGap;
  const bar = tube(b, { x, y: POSTS.crossbar, z: -g }, { x, y: POSTS.crossbar, z: g }, GOAL.barRadius);
  if (bar > 0) return { part: "crossbar", side, impulse: bar, point: at };
  for (const z of [-g, g]) {
    const j = tube(b, { x, y: POSTS.crossbar, z }, { x, y: POSTS.top, z }, GOAL.uprightRadius);
    if (j > 0) return { part: "upright", side, impulse: j, point: at };
  }
  const n = net(b, side);
  return n > 0 ? { part: "net", side, impulse: n, point: at } : null;
}
