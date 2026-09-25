import { airborne, charOf } from "./athlete";
import type { Match } from "./match";
import { DEFENCE } from "./tuning";
import type { Athlete } from "./types";
import { clamp, dir2, dist2, yawOf } from "./vec";

/** Block and Steal share a button: close to the ball on defence it swipes, anywhere else it jumps. */
export function pressDefend(m: Match, a: Athlete): void {
  if ((a.action.kind !== "none" && a.action.kind !== "pass") || airborne(a)) return;
  const holder = m.holder;
  const stealable = holder && holder.team !== a.team && (holder.action.kind === "none" || holder.action.kind === "pass");
  if (holder && stealable && dist2(a, holder) < DEFENCE.stealRange) {
    if (a.stealCd > 0) return;
    a.action = { kind: "steal", t: 0, resolved: false };
    a.stealCd = DEFENCE.stealCooldown;
    a.yaw = yawOf(holder.x - a.x, holder.z - a.z);
    return;
  }
  if (a.blockCd > 0) return;
  const s = charOf(a).stats;
  a.action = { kind: "block", t: 0, peak: 0.42 + s.speed * 0.012 + s.strength * 0.008 };
  a.blockCd = DEFENCE.blockCooldown;
}

/** Block jumps last this long, feet to feet. */
export const BLOCK_AIR = 0.64;

export function updateBlock(m: Match, a: Athlete, dt: number): void {
  if (a.action.kind !== "block") return;
  a.action.t += dt;
  const s = a.action.t / BLOCK_AIR;
  a.y = Math.max(0, a.action.peak * 4 * s * (1 - s));
  if (s < 1) return;
  a.y = 0;
  a.action = { kind: "none" };
  m.emit({ type: "land", id: a.id, hard: false });
}

/**
 * The swipe lands a tenth of a second in. Quick hands help and a strong
 * dribbler protects the ball; reaching from behind a player who shields
 * it rarely works. A miss leaves the defender off balance.
 */
export function updateSteal(m: Match, a: Athlete, dt: number): void {
  if (a.action.kind !== "steal") return;
  a.action.t += dt;
  if (!a.action.resolved && a.action.t >= 0.1) {
    a.action.resolved = true;
    resolveSteal(m, a);
  }
  if (a.action.t >= 0.36) a.action = { kind: "none" };
}

function resolveSteal(m: Match, a: Athlete): void {
  const holder = m.holder;
  const reachable = holder && holder.team !== a.team && holder.action.kind !== "shoot" && holder.action.kind !== "drive";
  if (!holder || !reachable || dist2(a, holder) > DEFENCE.stealRange + 0.2) return whiff(m, a);
  const ds = charOf(a).stats;
  const hs = charOf(holder).stats;
  const toMe = dir2(holder, a);
  const shielded = Math.sin(holder.yaw) * toMe.x + Math.cos(holder.yaw) * toMe.z < -0.3;
  const chance = clamp(0.3 + (ds.speed - 5) * 0.03 + (5 - hs.strength) * 0.025 - (shielded ? 0.14 : 0), 0.08, 0.6);
  if (m.rng() >= chance) return whiff(m, a);
  const b = m.ball;
  const side = m.rng() < 0.5 ? -1 : 1;
  b.mode = "loose";
  b.holder = null;
  b.flight = null;
  b.flightKind = null;
  b.shot = null;
  b.pos = { x: holder.x + toMe.x * 0.4, y: 0.9, z: holder.z + toMe.z * 0.4 };
  b.vel = { x: toMe.x * 2.4 - toMe.z * side * 0.8, y: 1.6, z: toMe.z * 2.4 + toMe.x * side * 0.8 };
  b.lastTouch = a.id;
  holder.grabCd = DEFENCE.grabCooldown;
  a.box.steals++;
  m.emit({ type: "steal", id: a.id, victim: holder.id });
}

function whiff(m: Match, a: Athlete): void {
  a.whiff = DEFENCE.whiffTime;
  m.emit({ type: "whiff", id: a.id });
}
