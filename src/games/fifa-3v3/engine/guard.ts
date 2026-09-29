import { moveAthlete, turnToward } from "./athlete";
import { markSpot } from "./bot-shape";
import { owns } from "./kick";
import type { Athlete, Command, MatchState } from "./types";
import { add, clamp, dist, len, norm, scale, sub } from "./vec";

/**
 * Holding Guard on defence. The player shadows the opponent they mark,
 * goal side of them at a marking distance, a little slower than they
 * could run themselves. It only takes over within range of that man.
 * A dribbler, and even more a skill move, leaves the guard trailing, so
 * the stick is needed to catch up: any push on it takes back control.
 */
export const GUARD = {
  /** Guard only takes over this close to the marked man. */
  range: 7,
  /** How far goal side of him the guard stays. */
  gap: 1.4,
  /** A share of the player's own top speed. */
  speed: 0.8,
  /** Seconds the guard's aim trails behind: a man without the ball, a dribbler, a skill move. */
  lagOff: 0.12,
  lagDribble: 0.42,
  lagSkill: 0.95,
  /** A push on the stick past this is manual control. */
  manual: 0.3,
} as const;

/**
 * Who a player marks: the opponent in the same channel of the pitch,
 * which is the same place in the line up (see lanes.ts). With uneven
 * sides the places wrap round, so everyone always has a man.
 */
export function markOf(state: MatchState, a: Athlete): Athlete | null {
  const foes = state.athletes.filter((o) => o.team !== a.team).sort((x, y) => x.slot - y.slot);
  if (foes.length === 0) return null;
  return foes.find((o) => o.slot === a.slot) ?? foes[a.slot % foes.length]!;
}

/** Whether a side is defending: the other side has the ball, or touched it last. */
export function defending(state: MatchState, a: Athlete): boolean {
  const owner = state.ball.owner;
  if (owner?.kind === "athlete") return state.athletes[owner.id]!.team !== a.team;
  if (owner?.kind === "keeper") return owner.team !== a.team;
  const last = state.ball.lastTouch;
  return last !== null && last.team !== a.team;
}

/**
 * One step of Guard for a free player. Returns true when Guard moved the
 * player, so the stick is not applied on top.
 */
export function guardStep(state: MatchState, a: Athlete, c: Command, dt: number): boolean {
  const g = a.guard;
  g.held = c.guard === true;
  const mark = markOf(state, a);
  const engaged = g.held && mark !== null && !owns(state, a) && len(c.move) < GUARD.manual && dist(a.pos, mark.pos) <= GUARD.range;
  if (!engaged || !mark) {
    // Re-engaging later eases in from where the player is.
    g.on = false;
    g.lag = { ...a.pos };
    return false;
  }
  if (!g.on) g.lag = { ...a.pos };
  g.on = true;
  const target = markSpot(a, mark, GUARD.gap);
  const tau = !owns(state, mark) ? GUARD.lagOff : mark.action === "skill" ? GUARD.lagSkill : len(mark.vel) > 2.5 ? GUARD.lagDribble : GUARD.lagOff;
  const k = 1 - Math.exp(-dt / tau);
  g.lag = add(g.lag, sub(target, g.lag), k);
  const to = sub(g.lag, a.pos);
  const d = len(to);
  // Full guard pace until close, then easing onto the spot so it never jitters there.
  const want = d < 0.08 ? { x: 0, z: 0 } : scale(norm(to), GUARD.speed * clamp(d / 0.9, 0.2, 1));
  moveAthlete(a, want, dt, false);
  // Square on to the man, watching the ball.
  const ball = state.ball.pos;
  turnToward(a, Math.atan2(ball.z - a.pos.z, ball.x - a.pos.x), 10 * dt);
  return true;
}

/** What the phone shows about Guard: the man, how far, and whether Guard can take over. */
export function guardInfo(state: MatchState, a: Athlete): { mark: number; distance: number; inRange: boolean; on: boolean } | null {
  const mark = markOf(state, a);
  if (!mark) return null;
  const distance = dist(a.pos, mark.pos);
  return { mark: mark.id, distance, inRange: distance <= GUARD.range, on: a.guard.on };
}
