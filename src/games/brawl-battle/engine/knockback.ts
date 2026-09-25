import type { Hit } from "./moves";
import { HITSTOP, LAUNCH } from "./tuning";
import type { Vec2 } from "./types";

/**
 * The heart of the game: every hit adds damage, and the more damage a
 * fighter carries the faster the same hit launches them. A launch then
 * slows down steadily (LAUNCH.decay), so it carries speed squared over
 * twice the decay: double the speed flies four times as far.
 */

/** How much less a heavy fighter flies: 1 at weight 100, lower when heavier. */
export function weightFactor(weight: number): number {
  return 200 / (weight + 100);
}

/** Launch speed in metres per second, from the damage after the hit lands. */
export function launchSpeed(hit: Hit, percentAfter: number, weight: number): number {
  return (hit.base + hit.growth * percentAfter) * weightFactor(weight);
}

/**
 * The launch as a velocity. Angles are written facing right; `side` is
 * which way the hit sends them, so the same move works both ways.
 */
export function launchVector(speed: number, angleDeg: number, side: 1 | -1): Vec2 {
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(a) * speed * side, y: Math.sin(a) * speed };
}

/** How far a launch alone carries, ignoring gravity and steering. */
export function launchDistance(speed: number): number {
  return (speed * speed) / (2 * LAUNCH.decay);
}

/** Frames a launched fighter cannot act. */
export function hitstunFrames(speed: number): number {
  return Math.round(speed * LAUNCH.stunPerSpeed);
}

/** Frames both fighters freeze on contact. Heavy moves hold longer, so they feel solid. */
export function hitstopFrames(damage: number, heavy: boolean): number {
  const frames = (HITSTOP.base + damage * HITSTOP.perDamage) * (heavy ? HITSTOP.heavy : 1);
  return Math.min(HITSTOP.max, Math.round(frames));
}

/** Slows a launch by one step of decay, never past zero. */
export function decayLaunch(launch: Vec2, dt: number): void {
  const speed = Math.hypot(launch.x, launch.y);
  if (speed === 0) return;
  const next = Math.max(0, speed - LAUNCH.decay * dt);
  launch.x *= next / speed;
  launch.y *= next / speed;
}
