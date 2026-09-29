import { brake, footPoint } from "./athlete";
import { STEAL } from "./defence-tuning";
import { commitFoul } from "./fouls";
import type { Athlete, MatchState } from "./types";
import { clamp, dist, dot, fromAngle, norm, sub } from "./vec";

/**
 * The steal: a quick standing poke at the dribbler's ball, open to any
 * defender at any time. It either nicks the ball away or misses it, and
 * a boot that misses the ball can catch the man instead, more often
 * from behind. That is a foul.
 */
export function startSteal(state: MatchState, a: Athlete): void {
  if (a.action !== "free" || a.defendWait > 0) return;
  const toBall = norm(sub(state.ball.pos, a.pos));
  a.action = "steal";
  a.actionT = 0;
  a.actionLen = STEAL.duration;
  a.actionDir = toBall.x === 0 && toBall.z === 0 ? fromAngle(a.facing) : toBall;
  a.facing = Math.atan2(a.actionDir.z, a.actionDir.x);
  // A short lunge in: the steal reaches a little further than standing still.
  a.vel.x = a.actionDir.x * 3.2;
  a.vel.z = a.actionDir.z * 3.2;
  a.defendWait = STEAL.wait;
  a.charging = false;
}

/** One step of a steal. The boot is tested once, at full stretch. */
export function updateSteal(state: MatchState, a: Athlete, before: number, dt: number): void {
  brake(a, dt, 7);
  if (before < STEAL.contactAt && a.actionT >= STEAL.contactAt) poke(state, a);
}

function poke(state: MatchState, a: Athlete): void {
  const ball = state.ball;
  const owner = ball.owner;
  if (owner?.kind !== "athlete") return;
  const carrier = state.athletes[owner.id];
  if (!carrier || carrier.team === a.team) return;
  const boot = footPoint(a);
  const toe = { x: boot.x + a.actionDir.x * 0.35, z: boot.z + a.actionDir.z * 0.35 };
  if (dist(toe, ball.pos) > STEAL.reach) {
    // Nowhere near the ball, but a lunge into the man's heels is still a foul.
    if (dist(toe, carrier.pos) < 0.7 && state.rng.chance(STEAL.foul)) commitFoul(state, a, carrier);
    return;
  }
  // From behind: the defender stands where the dribbler is running from.
  const behind = Math.max(0, dot(fromAngle(carrier.facing), norm(sub(carrier.pos, a.pos))));
  const chance = clamp(0.42 + 0.5 * (a.strength - carrier.strength) - 0.45 * (carrier.dribbling - 0.75) - 0.25 * behind + (a.guarding ? 0.1 : 0), 0.08, 0.8);
  if (state.rng.chance(chance)) {
    const away = a.actionDir;
    ball.owner = null;
    ball.vel = { x: away.x * 3.4 + carrier.vel.x * 0.3, y: 0.2, z: away.z * 3.4 + carrier.vel.z * 0.3 };
    ball.lastTouch = { team: a.team, id: a.id };
    ball.passTo = null;
    carrier.noTouch = 0.5;
    a.stats.tackles++;
    state.events.push({ type: "steal", athlete: a.id, victim: carrier.id, won: true });
    return;
  }
  if (state.rng.chance(STEAL.foul + STEAL.foulBehind * behind)) return commitFoul(state, a, carrier);
  state.events.push({ type: "steal", athlete: a.id, victim: carrier.id, won: false });
}
