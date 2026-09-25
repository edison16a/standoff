import { charOf } from "./athlete";
import { foulChance } from "./fouls";
import { callFoul } from "./free-throw";
import type { Match } from "./match";
import { DEFENCE } from "./tuning";
import type { Athlete } from "./types";
import { clamp, dir2, dist2, yawOf, type V2 } from "./vec";

/** When the swipe reaches the ball, and when the lunge is over. */
const SWIPE_AT = 0.1;
const SWIPE_END = 0.36;

/** A ball handler can be reached while dribbling, passing or making a move, not once up for a shot. */
export function stealable(holder: Athlete): boolean {
  const k = holder.action.kind;
  return k === "none" || k === "pass" || k === "move";
}

/** Whether a defender is right next to the ball handler, close enough to swipe. */
export function inStealRange(a: Athlete, holder: Athlete, slack = 0): boolean {
  return dist2(a, holder) < DEFENCE.stealRange + slack;
}

/** Starts a swipe and counts it against this defender's tally on the ball handler. */
export function startSteal(m: Match, a: Athlete, holder: Athlete): void {
  if (a.stealCd > 0) return;
  const attempt = m.stealLog.attempt(a.id, holder.id);
  a.action = { kind: "steal", t: 0, resolved: false, victim: holder.id, attempt };
  a.stealCd = DEFENCE.stealCooldown;
  a.yaw = yawOf(holder.x - a.x, holder.z - a.z);
}

/**
 * The swipe lands a tenth of a second in. Quick hands help, a strong
 * dribbler protects the ball, and reaching in on the ball side is far
 * better than across the body or from behind. Reach in too often and
 * the whistle goes instead. A miss leaves the defender off balance.
 */
export function updateSteal(m: Match, a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "steal") return;
  act.t += dt;
  if (!act.resolved && act.t >= SWIPE_AT) {
    act.resolved = true;
    resolveSteal(m, a, act.attempt);
  }
  if (a.action.kind === "steal" && a.action.t >= SWIPE_END) a.action = { kind: "none" };
}

/** Which side of the ball handler the defender reaches from: 1 the ball side, -1 across the body. */
export function ballSide(a: V2, holder: Athlete): number {
  const rx = -Math.cos(holder.yaw);
  const rz = Math.sin(holder.yaw);
  const across = (a.x - holder.x) * rx + (a.z - holder.z) * rz;
  return Math.sign(across) === Math.sign(holder.dribbleSide) ? 1 : -1;
}

function resolveSteal(m: Match, a: Athlete, attempt: number): void {
  const holder = m.holder;
  if (!holder || holder.team === a.team || !stealable(holder) || !inStealRange(a, holder, 0.15)) return whiff(m, a);
  if (m.phase === "live" && m.rng() < foulChance(attempt)) return callFoul(m, a, holder);
  const ds = charOf(a).stats;
  const hs = charOf(holder).stats;
  const toMe = dir2(holder, a);
  const shielded = Math.sin(holder.yaw) * toMe.x + Math.cos(holder.yaw) * toMe.z < -0.3;
  const side = ballSide(a, holder) > 0 ? 0.1 : -0.12;
  const chance = clamp(0.3 + (ds.speed - 5) * 0.03 + (5 - hs.strength) * 0.025 + side - (shielded ? 0.14 : 0), 0.05, 0.62);
  if (m.rng() >= chance) return whiff(m, a);
  knockLoose(m, holder, toMe, 2.4);
  m.ball.lastTouch = a.id;
  a.box.steals++;
  m.emit({ type: "steal", id: a.id, victim: holder.id });
}

/** The ball is knocked out of a handler's hands, off toward `dir` with a little sideways spill. */
export function knockLoose(m: Match, holder: Athlete, dir: V2, speed: number): void {
  const b = m.ball;
  const spill = m.rng() < 0.5 ? -1 : 1;
  b.mode = "loose";
  b.holder = null;
  b.flight = null;
  b.flightKind = null;
  b.shot = null;
  b.pos = { x: holder.x + dir.x * 0.4, y: 0.9, z: holder.z + dir.z * 0.4 };
  b.vel = { x: dir.x * speed - dir.z * spill * 0.8, y: 1.6, z: dir.z * speed + dir.x * spill * 0.8 };
  b.lastTouch = holder.id;
  holder.grabCd = DEFENCE.grabCooldown;
}

function whiff(m: Match, a: Athlete): void {
  a.whiff = DEFENCE.whiffTime;
  m.emit({ type: "whiff", id: a.id });
}
