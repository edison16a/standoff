import { isDown } from "./athlete";
import { BODY, LINE } from "./tuning";
import type { MatchState } from "./types";
import { dot, scale, sub, type Vec2 } from "./vec";

interface Body {
  pos: Vec2;
  vel: Vec2;
  mass: number;
  radius: number;
  /** Linemen hold their ground in their fight: they are pushed, but never steered by a hit. */
  anchored: boolean;
}

const LINEMAN_RADIUS = 0.55;

/**
 * Bodies bump and shove instead of passing through each other. Overlap
 * is split by mass, and the closing speed is shared as in a dead hit, so
 * a big back running into a small corner keeps going. A rusher leaning in
 * with Rush counts as heavier against a blocker, which is what lets him
 * push through. Players on the grass are stepped over.
 */
export function collide(state: MatchState): void {
  const bodies: Body[] = [];
  for (const a of state.athletes) {
    if (isDown(a)) continue;
    const rushing = a.rush && a.team !== state.drive.offense;
    bodies.push({ pos: a.pos, vel: a.vel, mass: rushing ? a.mass * 2.4 : a.mass, radius: BODY.radius, anchored: false });
  }
  for (const l of state.linemen) bodies.push({ pos: l.pos, vel: l.vel, mass: LINE.mass, radius: LINEMAN_RADIUS, anchored: true });
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) separate(bodies[i]!, bodies[j]!);
  }
}

function separate(a: Body, b: Body): void {
  if (a.anchored && b.anchored) return;
  const d = sub(b.pos, a.pos);
  const gap = Math.hypot(d.x, d.z);
  const overlap = a.radius + b.radius - gap;
  if (overlap <= 0 || gap < 1e-6) return;
  const n = scale(d, 1 / gap);
  // A lineman gives a little ground; everyone else splits it by mass.
  const wa = a.anchored ? 0.25 : b.anchored ? 0.75 : b.mass / (a.mass + b.mass);
  const wb = 1 - wa;
  a.pos.x -= n.x * overlap * wa;
  a.pos.z -= n.z * overlap * wa;
  b.pos.x += n.x * overlap * wb;
  b.pos.z += n.z * overlap * wb;
  const closing = dot(sub(a.vel, b.vel), n);
  if (closing <= 0) return;
  // An inelastic hit: both end with the same speed along the line between them.
  if (!a.anchored) {
    a.vel.x -= n.x * closing * wa;
    a.vel.z -= n.z * closing * wa;
  }
  if (!b.anchored) {
    b.vel.x += n.x * closing * wb;
    b.vel.z += n.z * closing * wb;
  }
}
