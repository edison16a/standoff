import { footPoint } from "./athlete";
import { SLIDE } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, dist, norm } from "./vec";


/**
 * How likely the referee gives a foul for a slide. Through the back of
 * the man it nearly always is; taking the man before the ball often is;
 * a clean slide at the ball from the front or side almost never.
 */
export function foulChance(fromBehind: number, manFirst: boolean): number {
  if (fromBehind > 0.5) return clamp(0.6 + (fromBehind - 0.5) * 0.8, 0, 0.95);
  return manFirst ? 0.2 : 0.03;
}

/** Down on the turf: the tackled man stumbles and is off the ball for a moment. */
export function knockDown(state: MatchState, victim: Athlete): void {
  victim.action = "stumble";
  victim.actionT = 0;
  victim.actionLen = SLIDE.stumble;
  victim.charging = false;
  victim.charge = 0;
  victim.noTouch = SLIDE.stumble * 0.6;
  state.events.push({ type: "stumble", athlete: victim.id });
}

/**
 * Standing challenges: a defender right at the dribbler's feet may nick
 * the ball away, a good tackler more often. Strength and close control
 * hold them off, and a player
 * who has only just taken the ball cannot be robbed on the spot.
 */
export function challenges(state: MatchState, dt: number): void {
  const ball = state.ball;
  if (ball.owner?.kind !== "athlete" || ball.heldFor < 0.45) return;
  const carrier = state.athletes[ball.owner.id];
  // Mid skill move the ball is tested once, in skills.ts, not nicked step by step.
  if (!carrier || carrier.action === "hurdle" || carrier.action === "skill") return;
  for (const o of state.athletes) {
    if (o.team === carrier.team || o.action !== "free" || o.noTouch > 0) continue;
    if (dist(footPoint(o), ball.pos) > 0.55) continue;
    const rate = 1.3 * clamp(0.5 + 0.5 * o.attrs.tackling + 0.3 * o.attrs.strength - 0.5 * carrier.attrs.strength - 0.35 * carrier.attrs.dribbling, 0.08, 1);
    if (!state.rng.chance(rate * dt)) continue;
    const away = norm({ x: ball.pos.x - o.pos.x, z: ball.pos.z - o.pos.z });
    ball.owner = null;
    ball.vel = { x: away.x * 2.5 + o.vel.x * 0.4, y: 0, z: away.z * 2.5 + o.vel.z * 0.4 };
    ball.lastTouch = { team: o.team, id: o.id };
    ball.struckAt = state.time;
    carrier.noTouch = 0.45;
    o.stats.tackles++;
    state.events.push({ type: "tackle", athlete: o.id, victim: carrier.id, won: true });
    return;
  }
}
