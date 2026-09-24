import { attackSign } from "../teams";
import { BALL, PASS } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { dist, dot, len, norm, sub, type Vec2, type Vec3 } from "./vec";

/** Metres to the nearest opponent, capped: how free a player is to receive. */
export function openness(state: MatchState, a: Athlete, at: Vec2 = a.pos): number {
  let nearest = 6;
  for (const o of state.athletes) if (o.team !== a.team) nearest = Math.min(nearest, dist(o.pos, at));
  return nearest;
}

/**
 * Who a pass goes to. With the stick pushed, the team mate most in that
 * direction, within a cone. With the stick centred, the most open team
 * mate, leaning toward those further up the pitch.
 */
export function choosePassTarget(state: MatchState, a: Athlete, aim: Vec2 | null): Athlete | null {
  const forward = attackSign(a.team);
  let best: Athlete | null = null;
  let bestScore = -Infinity;
  const pushed = aim && len(aim) > 0.3 ? norm(aim) : null;
  for (const m of state.athletes) {
    if (m.team !== a.team || m.id === a.id) continue;
    const to = sub(m.pos, a.pos);
    const d = len(to);
    if (d < 1.2) continue;
    let score: number;
    if (pushed) {
      const cos = dot(norm(to), pushed);
      if (cos < Math.cos(PASS.cone)) continue;
      score = cos * 3 - d * 0.04 + openness(state, m) * 0.15;
    } else {
      score = openness(state, m) * 0.5 + ((m.pos.x - a.pos.x) * forward) * 0.12 - d * 0.05;
    }
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/**
 * A ground pass that reaches `to` at a comfortable pace, however far:
 * the turf slows a rolling ball steadily, so the starting speed follows
 * from the distance.
 */
export function passVelocity(from: Vec3, to: Vec2, arrive: number = PASS.arrive): Vec3 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const d = Math.max(0.1, Math.hypot(dx, dz));
  const speed = Math.min(PASS.maxSpeed, Math.sqrt(arrive * arrive + 2 * BALL.roll * d));
  return { x: (dx / d) * speed, y: 0, z: (dz / d) * speed };
}

/** Where to send it so a running receiver meets it: their spot, plus where they are heading. */
export function leadFor(from: Vec3, receiver: Athlete): Vec2 {
  let target = { ...receiver.pos };
  for (let i = 0; i < 2; i++) {
    const d = Math.hypot(target.x - from.x, target.z - from.z);
    const v0 = Math.min(PASS.maxSpeed, Math.sqrt(PASS.arrive * PASS.arrive + 2 * BALL.roll * d));
    const t = d / ((v0 + PASS.arrive) / 2);
    target = { x: receiver.pos.x + receiver.vel.x * t * 0.8, z: receiver.pos.z + receiver.vel.z * t * 0.8 };
  }
  return target;
}
