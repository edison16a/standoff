import { attackSign } from "../teams";
import { isDown } from "./athlete";
import type { Athlete, MatchState } from "./types";
import { add, clampLen, dist, scale, sub, v2, type Vec2 } from "./vec";

/** Guard sits this far goal side of the runner, where a real corner plays. */
const CUSHION = 1.3;
/** Yards of gap that ask for a full sprint. */
const FULL = 2.5;

/**
 * Who a player on Guard tails: the runner already marked while he stays
 * on his feet, else the nearest attacking player other than a quarterback
 * still holding the ball in the pocket.
 */
export function markFor(state: MatchState, a: Athlete): Athlete | null {
  const kept = a.guard.mark === null ? null : state.athletes[a.guard.mark];
  if (kept && kept.team !== a.team && !isDown(kept)) return kept;
  let best: Athlete | null = null;
  for (const o of state.athletes) {
    if (o.team === a.team || isDown(o)) continue;
    if (o.role === "qb" && state.play.carrier !== o.id && !state.play.thrown) continue;
    if (!best || dist(o.pos, a.pos) < dist(best.pos, a.pos)) best = o;
  }
  return best;
}

/**
 * The stick a guarding player gets: toward a spot just goal side of the
 * mark and where the mark is heading, so the defender mirrors the run.
 * Guard steers, so the player cannot jump a route to intercept.
 */
export function guardStick(state: MatchState, a: Athlete): Vec2 {
  const mark = markFor(state, a);
  a.guard.mark = mark?.id ?? null;
  if (!mark) return v2();
  const goalward = v2(attackSign(mark.team), 0);
  const spot = add(add(mark.pos, mark.vel, 0.35), goalward, CUSHION);
  return clampLen(scale(sub(spot, a.pos), 1 / FULL), 1);
}
