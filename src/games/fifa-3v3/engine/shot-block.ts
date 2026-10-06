import { newBall, stepBall } from "./ball";
import { BODY } from "./blockers";
import { blockLane, blockSharpness } from "./build-effects";
import { JUMP } from "./defend";
import type { Kick } from "./shot-aim";
import { BALL, STEP } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, clamp01, type Vec3 } from "./vec";

/**
 * Defenders throwing themselves in front of a shot. Each one near the
 * ball's real path, the one the strike will fly, sees it after his
 * reaction time and can lunge a step and stretch a leg toward it. If he
 * can get his body onto the line before the ball gets there, and the
 * ball is not over his head, he goes for it, more readily with sharp
 * reflexes and the closer it passes. The ball then meets his body in
 * the flight, and the bounce off it is physics.
 */
export const LUNGE = {
  /** Seconds to see the strike and move, before reflexes. */
  react: 0.22,
  /** A defender reads the backswing, so he can start this early, before the ball is struck. */
  anticipate: 0.15,
  /** How fast a lunge carries the body, m/s, and how far a leg stretches past it. */
  speed: 3.6,
  leg: 0.55,
  /** No block closer than this to the boot, or further than this down the path. */
  near: 1.1,
  far: 12,
} as const;

/** The flight a kick will make, sampled every match step until it is past `untilX` or 1.5 seconds. */
export function samplePath(from: Vec3, kick: Kick, untilX: number): { at: Vec3; t: number }[] {
  const ball = newBall();
  ball.pos = { ...from };
  ball.vel = { ...kick.vel };
  ball.spin = { ...kick.spin };
  const dir = Math.sign(untilX - from.x) || 1;
  const path: { at: Vec3; t: number }[] = [];
  for (let t = STEP; t < 1.5; t += STEP) {
    stepBall(ball, STEP, [], { flightOnly: true });
    path.push({ at: { ...ball.pos }, t });
    if ((ball.pos.x - untilX) * dir > 0) break;
  }
  return path;
}

/** Standing, running or already up for a jump: not on the floor or mid slide. */
function canBlock(a: Athlete): boolean {
  return a.action === "free" || a.action === "jump" || a.action === "beaten";
}

/**
 * Picks the defender who gets in the way of this kick, if anyone, and
 * throws him into its path. Returns his id, or null.
 */
export function chargeDown(state: MatchState, shooter: Athlete, from: Vec3, kick: Kick, goalLine: number): number | null {
  const path = samplePath(from, kick, goalLine);
  let best: { a: Athlete; t: number; at: Vec3; gap: number } | null = null;
  for (const o of state.athletes) {
    if (o.team === shooter.team || !canBlock(o)) continue;
    const react = LUNGE.react * (1.35 - 0.6 * o.attrs.reflexes) - LUNGE.anticipate;
    for (const p of path) {
      const along = Math.hypot(p.at.x - from.x, p.at.z - from.z);
      if (along < LUNGE.near || along > LUNGE.far || p.t < react) continue;
      const gap = Math.hypot(p.at.x - o.pos.x, p.at.z - o.pos.z) - BODY.radius - BALL.radius;
      const reach = LUNGE.leg * blockLane(o) + LUNGE.speed * (p.t - react);
      // Over his head even in a leap, or out of reach: not this point.
      if (p.at.y - BALL.radius > BODY.height + JUMP.height || gap > reach) continue;
      if (!best || p.t < best.t) best = { a: o, t: p.t, at: p.at, gap };
      break;
    }
  }
  if (!best) return null;
  const o = best.a;
  // Central and early he cannot miss it; a long stretch he may not risk.
  const commit = clamp01((1.15 - best.gap / (LUNGE.leg * blockLane(o) + 0.6)) * blockSharpness(o));
  if (!state.rng.chance(commit)) return null;
  throwBodyIn(state, o, best.at, best.t);
  return o.id;
}

/**
 * Sends the defender lunging onto the ball's line so his body is on it
 * as the ball arrives, leaping if it is coming in high. The leap's
 * braking (defend.ts) is allowed for in the lunge.
 */
export function throwBodyIn(state: MatchState, o: Athlete, at: Vec3, t: number): void {
  const dx = at.x - o.pos.x;
  const dz = at.z - o.pos.z;
  const d = Math.hypot(dx, dz);
  // Into the line, not just touching it, so the ball meets him square.
  const go = Math.max(0, d - 0.1);
  const brake = 1.5;
  const speed = clamp((go * brake) / Math.max(0.05, 1 - Math.exp(-brake * t)), 0, 7);
  o.action = "jump";
  o.actionLen = JUMP.length;
  // A low ball is met crouched and lunging, the leap held back until it has gone; a high one at the top of the leap.
  o.actionT = at.y < 1 ? -t : Math.min(0, JUMP.length / 2 - t);
  o.vel = d > 1e-6 ? { x: (dx / d) * speed, z: (dz / d) * speed } : { x: 0, z: 0 };
  o.facing = Math.atan2(-dz, -dx);
  o.noTouch = 0;
  o.charging = false;
  o.guard.on = false;
  state.events.push({ type: "jump", athlete: o.id });
}
