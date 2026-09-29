import { other } from "../teams";
import { moveAthlete, topSpeed, turnToward } from "./athlete";
import { GUARD } from "./defence-tuning";
import { goalX } from "./goal";
import { laneOf } from "./lanes";
import type { Athlete, MatchState } from "./types";
import { dist, len, lerp, norm, sub, type Vec2 } from "./vec";

/**
 * Holding Guard on defence. The player shadows the opponent they mark on
 * their own, staying between him and our goal a set gap off, a little
 * slower than a flat out sprint. The shadow reads the man late: a
 * dribble drags it and a skill move leaves it far behind, so the stick
 * is needed to catch up. Pushing the stick always takes over, and out
 * of range nothing happens until the defender runs back into it.
 */

export type GuardStatus = "off" | "on" | "far";

/** Whether this player's side is defending: the other side has the ball. */
export function defending(state: MatchState, a: Athlete): boolean {
  const owner = state.ball.owner;
  if (!owner) return false;
  const team = owner.kind === "athlete" ? state.athletes[owner.id]?.team : owner.team;
  return team === other(a.team);
}

/** Who a player marks: the opponent in the same channel, else the nearest one. */
export function guardTarget(state: MatchState, a: Athlete): Athlete | null {
  const foes = state.athletes.filter((o) => o.team !== a.team);
  const lane = laneOf(state, a);
  const same = foes.find((o) => laneOf(state, o) === lane);
  if (same) return same;
  return foes.sort((p, q) => dist(p.pos, a.pos) - dist(q.pos, a.pos))[0] ?? null;
}

/** What Guard is doing for this player now, for the phone to show. */
export function guardStatus(state: MatchState, a: Athlete): GuardStatus {
  if (!a.guarding || !defending(state, a)) return "off";
  const man = guardTarget(state, a);
  return man && dist(a.pos, man.pos) <= GUARD.range ? "on" : "far";
}

/** Where the shadow wants to be: goal side of the man, tight on the ball, sagging toward it off it. */
export function guardSpot(state: MatchState, a: Athlete, man: Athlete): Vec2 {
  const goal = { x: goalX(a.team), z: 0 };
  const toGoal = norm(sub(goal, man.pos));
  const owner = state.ball.owner;
  const onBall = owner?.kind === "athlete" && owner.id === man.id;
  const gap = onBall ? GUARD.gapOnBall : GUARD.gapOff;
  const spot = { x: man.pos.x + toGoal.x * gap, z: man.pos.z + toGoal.z * gap };
  if (onBall) return spot;
  const ball = state.ball.pos;
  return { x: lerp(spot.x, ball.x, GUARD.sag), z: lerp(spot.z, ball.z, GUARD.sag) };
}

/** How quickly the shadow's spot follows the man: slower while he dribbles, slowest in a skill move. */
function trackRate(state: MatchState, man: Athlete): number {
  if (man.action === "skill") return GUARD.skillTrack;
  const owner = state.ball.owner;
  const onBall = owner?.kind === "athlete" && owner.id === man.id;
  return onBall && len(man.vel) > 1.2 ? GUARD.dribbleTrack : GUARD.track;
}

/**
 * One step of a guarding player with the stick near the middle. Returns
 * false when Guard is not steering (out of range, or not defending),
 * so the ordinary running takes over.
 */
export function steerGuard(state: MatchState, a: Athlete, stick: Vec2, dt: number): boolean {
  const man = guardStatus(state, a) === "on" ? guardTarget(state, a) : null;
  if (!man || len(stick) > GUARD.takeover) {
    // Manual control, or nothing to shadow: the shadow starts again from here next time.
    a.guardSpot = null;
    return false;
  }
  const want = guardSpot(state, a, man);
  const k = 1 - Math.exp(-trackRate(state, man) * dt);
  const spot = a.guardSpot ?? { ...a.pos };
  spot.x += (want.x - spot.x) * k;
  spot.z += (want.z - spot.z) * k;
  a.guardSpot = spot;
  const to = sub(spot, a.pos);
  const d = len(to);
  // Full shadowing pace far off, easing onto the spot so the defender settles instead of jittering.
  const pace = GUARD.speed * Math.min(1, d / 1.2);
  moveAthlete(a, d > 0.05 ? { x: (to.x / d) * pace, z: (to.z / d) * pace } : { x: 0, z: 0 }, dt, false);
  // A marker keeps his eyes on the man, shuffling rather than turning his back.
  turnToward(a, Math.atan2(man.pos.z - a.pos.z, man.pos.x - a.pos.x), 10 * dt);
  return true;
}

/** Top shadowing speed, for tests and the phone's range display. */
export function guardPace(a: Athlete): number {
  return topSpeed(a) * GUARD.speed;
}
