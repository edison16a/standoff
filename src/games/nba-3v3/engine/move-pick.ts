import { RIM_SPOT, rimDistance } from "./court";
import type { Match } from "./match";
import type { Athlete, DribbleMove } from "./types";
import { dir2, dist2, type V2 } from "./vec";

/** Stick pushes shorter than this count as neutral. */
const NEUTRAL = 0.35;
/** How far off straight at or away from the basket the stick can be and still count as forward or back. */
const STRAIGHT = 0.55;

/** The way to the basket from a player, or the way they face when right under it. */
export function basketDir(a: Athlete): V2 {
  if (rimDistance(a) > 0.3) return dir2(a, RIM_SPOT);
  return { x: Math.sin(a.yaw), z: Math.cos(a.yaw) };
}

/** A player's right hand side, attacking along `f`. It matches the dribbling hand, 1 for right. */
export const rightOf = (f: V2): V2 => ({ x: -f.z, z: f.x });

/** Which side of the ball handler someone is on, attacking the basket: 1 right, -1 left. */
export function sideOf(a: Athlete, o: V2): 1 | -1 {
  const r = rightOf(basketDir(a));
  return (o.x - a.x) * r.x + (o.z - a.z) * r.z >= 0 ? 1 : -1;
}

/** The closest opponent to the ball handler within `range`, the one a move has to beat. */
export function nearestDefender(m: Match, a: Athlete, range = 2.2): Athlete | null {
  let best: Athlete | null = null;
  let bestD = range;
  for (const o of m.opponents(a.team)) {
    const d = dist2(o, a);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

export interface MoveChoice {
  move: DribbleMove;
  /** The hand the ball ends in, or the way the move goes: 1 right, -1 left. */
  side: 1 | -1;
  /** Where the move carries the player. */
  dir: V2;
}

/**
 * Reads the stick against the way to the basket. Pulled back is a
 * stepback, left or right a crossover to that side, forward a spin
 * round the defender (away from the side they are on), and neutral a
 * hesitation, or behind the back when the defender sits on the ball.
 */
export function pickMove(a: Athlete, aim: V2 | null, defender: Athlete | null): MoveChoice {
  const f = basketDir(a);
  const r = rightOf(f);
  const l = aim ? Math.hypot(aim.x, aim.z) : 0;
  const hand = a.dribbleHand;
  if (!aim || l < NEUTRAL) {
    if (defender && sideOf(a, defender) === hand) {
      const side = hand === 1 ? -1 : 1;
      return { move: "behindBack", side, dir: { x: r.x * side, z: r.z * side } };
    }
    return { move: "hesitation", side: hand, dir: f };
  }
  const fwd = (aim.x * f.x + aim.z * f.z) / l;
  const lat = (aim.x * r.x + aim.z * r.z) / l;
  if (fwd < -STRAIGHT) return { move: "stepback", side: hand, dir: { x: -f.x, z: -f.z } };
  if (fwd > STRAIGHT) {
    const side = defender ? (sideOf(a, defender) === 1 ? -1 : 1) : lat >= 0 ? 1 : -1;
    return { move: "spin", side, dir: f };
  }
  const side = lat >= 0 ? 1 : -1;
  return { move: "crossover", side, dir: { x: r.x * side, z: r.z * side } };
}
