import { isDown, statsOf } from "./body";
import { coverReach } from "./build-effects";
import { botSkill } from "./bots/skill";
import type { Match } from "./match";
import type { Athlete } from "./types";
import { clamp, type V2 } from "./vec";

/**
 * Who can make a play on a pass, read once as the ball leaves the hand.
 * Every pass is thrown true and an open receiver always catches it; only
 * a defender in the lane gets a say. His threat, 0 to 1, weighs how
 * close he is to the ball's line, where along it he sits (jumping it in
 * front of the receiver beats chasing from behind) and how long the
 * ball hangs. The catch and pick moves then play it out (catch/touch.ts).
 */
export const LANE = {
  /** Metres either side of the ball's line an average defender can make a play from. */
  reach: 2.2,
  /** Placement: sat right in front of the receiver counts fully, near the QB this much, trailing behind him this much. */
  nearQb: 0.5,
  trailing: 0.6,
  /** Throw length: a quick pass gives him this much, one this long in metres gives him all of it. */
  quick: 0.7,
  long: 25,
  /** The most a single defender can ever be: a perfectly placed one still loses some. */
  max: 0.92,
} as const;

export interface LaneThreat {
  id: number;
  threat: number;
}

/** A spot's distance off the ball's line from `from` to `spot`, and how far along it, 0 at the QB to 1 at the catch. */
export function onLine(p: V2, from: V2, spot: V2): { off: number; along: number } {
  const dx = spot.x - from.x;
  const dz = spot.z - from.z;
  const len2 = dx * dx + dz * dz || 1;
  const along = ((p.x - from.x) * dx + (p.z - from.z) * dz) / len2;
  const u = clamp(along, 0, 1);
  return { off: Math.hypot(p.x - (from.x + dx * u), p.z - (from.z + dz * u)), along };
}

/**
 * The threat of one defender at `p`: `reach` is how far off the line he
 * can still get there, `skill` 0 to 1 for how well he plays the ball.
 */
export function laneThreat(p: V2, from: V2, spot: V2, reach: number, skill: number): number {
  const { off, along } = onLine(p, from, spot);
  // Behind the QB he is no threat to a ball going forward, and out of reach of the line none at all.
  if (along < 0 || off >= reach) return 0;
  // Right on the line he is in the ball's way; at the edge of his reach he only just gets a hand out.
  const close = 1 - (off / reach) ** 2;
  const place = along > 1 ? LANE.trailing : LANE.nearQb + (1 - LANE.nearQb) * along;
  const length = Math.hypot(spot.x - from.x, spot.z - from.z);
  const hang = clamp(LANE.quick + (1 - LANE.quick) * (length / LANE.long), LANE.quick, 1);
  return clamp(close * place * hang * skill, 0, LANE.max);
}

/** How well a defender plays the ball: a person fully, a computer by its level, a training dummy not at all. */
function skillOf(m: Match, d: Athlete): number {
  if (!d.auto) return 1;
  const s = botSkill(m.level);
  return s.acts ? 0.55 + 0.45 * s.accuracy : 0;
}

/** Defenders who can play a pass: on their feet and not tailing someone on Guard. */
const canPlayBall = (d: Athlete) => d.role !== "lineman" && !isDown(d) && d.guard === null;

/** Every defender with a play on a pass from `from` to `spot`, the biggest threat first. */
export function readLane(m: Match, qb: Athlete, from: V2, spot: V2): LaneThreat[] {
  const out: LaneThreat[] = [];
  for (const d of m.athletes) {
    if (d.team === qb.team || !canPlayBall(d)) continue;
    const threat = laneThreat(d, from, spot, LANE.reach * coverReach(statsOf(d)), skillOf(m, d));
    if (threat > 0) out.push({ id: d.id, threat });
  }
  return out.sort((a, b) => b.threat - a.threat);
}
