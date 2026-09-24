import { beyondArc, RIM_SPOT } from "../court";
import type { Match } from "../match";
import type { Athlete } from "../types";
import { dist2, segmentDistance, type V2 } from "../vec";

/** Per player memory for a computer player. */
export interface BotState {
  /** Seconds until the next decision, so they react at a human pace. */
  decideIn: number;
  /** Where they are heading. */
  target: V2 | null;
  /** How long this player has had the ball. */
  holdFor: number;
  /** For a jumper under way: how long to hold Shoot, in milliseconds. */
  shotAt: number | null;
  /** When to jump at a shooter, in seconds into their motion. */
  jumpAt: number | null;
  /** Off the ball: when to pick a new spot. */
  spotUntil: number;
  cutting: boolean;
}

export function freshState(): BotState {
  return { decideIn: 0, target: null, holdFor: 0, shotAt: null, jumpAt: null, spotUntil: 0, cutting: false };
}

/** Who has the ball, counting a pass on its way as already caught, so nobody freezes while it flies. */
export function ballCarrier(m: Match): Athlete | null {
  const b = m.ball;
  if (m.holder) return m.holder;
  if (b.mode === "flight" && b.flightKind === "pass" && b.passTo !== null) return m.athletes[b.passTo] ?? null;
  return null;
}

/** Steers toward a spot, easing in as it arrives, at a share of top speed. */
export function goTo(a: Athlete, spot: V2, urgency = 1): void {
  const dx = spot.x - a.x;
  const dz = spot.z - a.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.12) {
    a.move = { x: 0, z: 0 };
    return;
  }
  const pace = Math.min(1, d / 0.7) * urgency;
  a.move = { x: (dx / d) * pace, z: (dz / d) * pace };
}

/** Whether nobody stands in the way between a player and the rim. */
export function laneOpen(m: Match, a: Athlete, width = 1): boolean {
  return m.opponents(a.team).every((o) => {
    const s = segmentDistance(o, a, RIM_SPOT);
    return s.d > width || s.t < 0.05;
  });
}

/** The spots an offence spreads to: top, wings, corners, and the short corners near the rim. */
export const SPOTS: readonly V2[] = [
  { x: 0, z: 8.6 },
  { x: -5.2, z: 6.2 },
  { x: 5.2, z: 6.2 },
  { x: -6.8, z: 1.3 },
  { x: 6.8, z: 1.3 },
  { x: -2.6, z: 5.6 },
  { x: 2.6, z: 5.6 },
  { x: -3.4, z: 1.2 },
  { x: 3.4, z: 1.2 },
];

/** The spot furthest from the ball and from teammates, with a little noise so plays differ. */
export function bestSpot(m: Match, a: Athlete, avoid: readonly V2[], noise: number): V2 {
  let best = SPOTS[0]!;
  let score = -Infinity;
  for (const spot of SPOTS) {
    let s = Math.min(...avoid.map((p) => dist2(p, spot))) - dist2(a, spot) * 0.25 + (m.rng() - 0.5) * noise;
    if (m.needsClear && !beyondArc(spot)) s -= 5;
    if (s > score) {
      score = s;
      best = spot;
    }
  }
  return best;
}
