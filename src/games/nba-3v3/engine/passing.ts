import { clampToCourt } from "./court";
import type { Match } from "./match";
import { planPass } from "./shot-flight";
import { PASS } from "./tuning";
import type { Athlete } from "./types";
import { dir2, dist2, segmentDistance, yawOf, type V2 } from "./vec";

/** How far the nearest opponent is from a player: the bigger, the more open. */
export function openness(m: Match, a: Athlete): number {
  let best = Infinity;
  for (const o of m.opponents(a.team)) best = Math.min(best, dist2(o, a));
  return best;
}

/** Whether a defender stands in the passing lane between two players. */
function laneBlocked(m: Match, from: Athlete, to: Athlete): boolean {
  return m.opponents(from.team).some((o) => {
    const s = segmentDistance(o, from, to);
    return s.d < 0.7 && s.t > 0.15 && s.t < 0.85;
  });
}

/**
 * Picks who to pass to. With the stick pushed, the teammate most in that
 * direction; otherwise the most open one. Teammates who just called for
 * the ball, and players on phones, are favoured.
 */
export function choosePassTarget(m: Match, a: Athlete, aim: V2 | null): Athlete | null {
  let best: Athlete | null = null;
  let bestScore = -Infinity;
  const aimLen = aim ? Math.hypot(aim.x, aim.z) : 0;
  for (const t of m.teammates(a)) {
    const d = dist2(a, t);
    let score = Math.min(openness(m, t), 3) * 0.5 - d * 0.08;
    if (aim && aimLen > 0.35) {
      const dir = dir2(a, t);
      score += ((dir.x * aim.x + dir.z * aim.z) / aimLen) * 3;
    }
    if (!t.auto) score += 0.3;
    if (m.time - t.calledAt < 1.5) score += 2;
    if (laneBlocked(m, a, t)) score -= 1.2;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

/** Throws to a teammate, leading a runner, and lobs it over a defender standing in the lane. */
export function throwPass(m: Match, a: Athlete, target: Athlete): void {
  const b = m.ball;
  a.yaw = yawOf(target.x - a.x, target.z - a.z);
  const from = { x: a.x + Math.sin(a.yaw) * 0.35, y: 1.35, z: a.z + Math.cos(a.yaw) * 0.35 };
  const d = dist2(a, target);
  const lob = laneBlocked(m, a, target) && d > 3;
  const speed = lob ? PASS.lobSpeed : PASS.speed;
  const time = d / speed;
  const lead = clampToCourt({ x: target.x + target.vx * time * 0.9, z: target.z + target.vz * time * 0.9 }, 0.4);
  const to = { x: lead.x, y: 1.3, z: lead.z };
  b.holder = null;
  b.mode = "flight";
  b.flight = planPass(from, to, lob, speed);
  b.flightT = 0;
  b.flightSeg = -1;
  b.flightKind = "pass";
  b.passTo = target.id;
  b.passRolled = [];
  b.pos = { ...from };
  b.lastTouch = a.id;
  b.spin = 10;
  a.action = { kind: "pass", t: 0 };
  m.lastPass = { from: a.id, to: target.id, at: m.time };
  m.emit({ type: "pass", from: a.id, to: target.id, lob });
}
