import { statsOf } from "./body";
import type { Rng } from "./rng";
import type { Athlete } from "./types";
import { clamp, type V2 } from "./vec";

/**
 * A tackler reaching the ball carrier, settled by momentum. The two
 * bodies meet in a hard, sticky collision along the line between them,
 * so both trade momentum and the lighter or slower man is knocked back.
 * Then two questions: did the hit take his legs (a change of speed his
 * balance cannot absorb), and if not, can the tackler's grip hold a man
 * carrying that much momentum? Arm tackles from behind hold little; a
 * square wrap holds a lot; a big back at full speed runs through what a
 * speedster cannot.
 */
export const HIT = {
  /** The change of speed a carrier of average power and agility stays up through, metres a second. */
  balance: 2.6,
  perPower: 0.18,
  perAgility: 0.06,
  /** A hit from the front counts fully against balance; a shove from behind half. */
  behind: 0.5,
  /** What a square wrap holds against, newton seconds of the carrier's momentum, and what each point of power adds. */
  grip: 1250,
  perGrip: 100,
  /** Leg drive: a carrier's push through the tackle per point of power, on top of his momentum. */
  legs: 18,
  /** How much a hold varies from tackle to tackle. */
  spread: 0.28,
  /** The chance a big hit jars the ball loose, rising with how far past his balance it went. */
  fumbleBase: 0.01,
  perFumble: 0.012,
  fumbleCap: 0.07,
} as const;

export interface HitResult {
  /** The carrier is brought down. */
  down: boolean;
  /** He was hit hard enough to lose his feet whatever the grip: a big hit. */
  big: boolean;
  /** The ball comes out. */
  fumble: boolean;
  /** Change of speed the carrier took from the hit, metres a second. */
  dv: number;
  /** Where the hit came from on the ground, unit vector from tackler to carrier. */
  n: V2;
}

/** How square the tackler is: 1 meeting the runner head on, 0.62 from the side, 0.35 chasing from behind. */
export function squareness(tackler: Athlete, carrier: Athlete, n: V2): number {
  const speed = Math.hypot(carrier.vx, carrier.vz);
  const run = speed > 0.5 ? { x: carrier.vx / speed, z: carrier.vz / speed } : { x: Math.sin(carrier.yaw), z: Math.cos(carrier.yaw) };
  // n points from tackler to carrier: along the run means from behind.
  const along = n.x * run.x + n.z * run.z;
  return clamp(along < 0 ? 0.62 - 0.38 * along : 0.62 - 0.27 * along, 0.35, 1);
}

/**
 * Resolves the contact and changes both players' velocities. `wrap`
 * scales the grip: 1 for a lunging tackler, less for a lineman reaching
 * out of his block.
 */
export function resolveHit(tackler: Athlete, carrier: Athlete, rng: Rng, wrap = 1): HitResult {
  const dx = carrier.x - tackler.x;
  const dz = carrier.z - tackler.z;
  const d = Math.hypot(dx, dz) || 1;
  const n = { x: dx / d, z: dz / d };
  const before = { x: carrier.vx, z: carrier.vz };
  const speed = Math.hypot(before.x, before.z);
  const run = speed > 0.5 ? { x: before.x / speed, z: before.z / speed } : { x: Math.sin(carrier.yaw), z: Math.cos(carrier.yaw) };
  // A perfectly sticky collision along n: both end up with the same speed along it.
  const closing = (tackler.vx - carrier.vx) * n.x + (tackler.vz - carrier.vz) * n.z;
  const mt = tackler.mass;
  const mc = carrier.mass;
  const j = closing > 0 ? (closing * mt * mc) / (mt + mc) : 0;
  tackler.vx -= (n.x * j) / mt;
  tackler.vz -= (n.z * j) / mt;
  carrier.vx += (n.x * j) / mc;
  carrier.vz += (n.z * j) / mc;
  const c = statsOf(carrier);
  const along = n.x * run.x + n.z * run.z;
  // A shove in the back is half a hit; a hit in the chest or the side is all of one.
  const dv = (j / mc) * (along > 0 ? 1 - (1 - HIT.behind) * along : 1);
  const balance = HIT.balance + (c.power - 5) * HIT.perPower + (c.agility - 5) * HIT.perAgility;
  const big = dv >= balance;
  // What is left of his run after the hit, and his legs driving on.
  const carry = mc * Math.max(0, carrier.vx * run.x + carrier.vz * run.z) + HIT.legs * c.power;
  const into = Math.max(0, -along) * j;
  const hold = wrap * squareness(tackler, carrier, n) * (HIT.grip + HIT.perGrip * statsOf(tackler).power) + into;
  const held = hold * (1 + rng.gauss(HIT.spread)) >= carry;
  const down = big || held;
  const fumble = big && rng.chance(fumbleChance(dv - balance, c.hands, c.power));
  return { down, big, fumble, dv, n };
}

/** The ball is jarred loose more by a bigger hit, less from strong hands. */
export function fumbleChance(over: number, hands: number, power: number): number {
  const security = 1.3 - 0.06 * ((hands + power) / 2);
  return clamp(HIT.fumbleBase + over * HIT.perFumble, 0, HIT.fumbleCap) * security;
}
