import type { Rng } from "./rng";
import type { Kick } from "./shot-aim";
import { clamp, clamp01 } from "./vec";

/**
 * How a strike goes wrong. A shot is struck at a spot on the goal, and
 * the boot never does quite what was asked: a clean strike strays a
 * degree or two, more for a weaker finisher, under pressure, on the run
 * or first time, and a full red bar sprays it. Now and then the ball is
 * scuffed or sliced: a mis-hit that can go anywhere. The error turns
 * the kick and changes its pace and spin; the flight does the rest.
 */
export const STRIKE = {
  /** Spread of a clean strike's direction, radians: for a perfect finisher, and added for a poor one. */
  clean: 0.018,
  skill: 0.055,
  /** Added per unit of the charge bar's spread (see shotSpread). */
  bar: 0.05,
  /** Multipliers for a man on you, a first time hit, running at full pace and a volley. */
  pressure: 0.7,
  firstTime: 0.3,
  pace: 0.25,
  volley: 0.9,
  /** The up and down spread as a share of the side to side. */
  pitchShare: 0.75,
  /** A red bar gets under the ball: it climbs by up to this much more. */
  redLift: 0.05,
  /** The chance of a mis-hit, and how wild one is. */
  mishit: 0.03,
  mishitSkill: 0.18,
  mishitPressure: 0.08,
  mishitVolley: 0.12,
  mishitYaw: 0.1,
  mishitPitch: 0.08,
} as const;

export interface StrikeContext {
  /** The striker's finishing, 0 to 1. */
  finishing: number;
  /** The charge bar's spread, 0 to 1 (charge.ts). */
  spread: number;
  /** How deep into the red the bar went, 0 to 1. */
  red: number;
  /** 0 with nobody near, 1 with a man right on him. */
  pressure: number;
  firstTime: boolean;
  /** Running speed as a share of top speed. */
  pace: number;
  /** The ball was off the ground: a volley or a half volley. */
  volley: boolean;
}

export interface StrikeError {
  /** Radians turned left or right, and up or down. */
  yaw: number;
  pitch: number;
  /** Multiplies the pace off the boot. */
  pace: number;
  /** Stray sidespin, radians a second. */
  spin: number;
  mishit: boolean;
}

/** The chance a strike is mis-hit. */
export function mishitChance(c: StrikeContext): number {
  return clamp01(STRIKE.mishit + STRIKE.mishitSkill * (1 - c.finishing) + STRIKE.mishitPressure * c.pressure + (c.volley ? STRIKE.mishitVolley : 0) + 0.06 * c.red);
}

/** The spread of a clean strike's direction, radians. */
export function strikeSpread(c: StrikeContext): number {
  const scale = (1 + STRIKE.pressure * c.pressure) * (1 + (c.firstTime ? STRIKE.firstTime : 0)) * (1 + STRIKE.pace * clamp01(c.pace)) * (1 + (c.volley ? STRIKE.volley : 0));
  return (STRIKE.clean + STRIKE.skill * (1 - c.finishing) + STRIKE.bar * c.spread) * scale;
}

/** Rolls this strike's error. */
export function strikeError(c: StrikeContext, rng: Rng): StrikeError {
  const sigma = strikeSpread(c);
  const mishit = rng.chance(mishitChance(c));
  const yaw = rng.gauss() * sigma + (mishit ? rng.gauss() * STRIKE.mishitYaw : 0);
  // A scuffed ball is more often topped low or skied than not.
  const pitch = rng.gauss() * sigma * STRIKE.pitchShare + c.red * rng.range(0, STRIKE.redLift) + (mishit ? rng.gauss() * STRIKE.mishitPitch : 0);
  const pace = clamp(1 + rng.gauss() * 0.03 - (mishit ? rng.range(0.08, 0.3) : 0), 0.55, 1.08);
  const spin = rng.gauss() * (mishit ? 22 : 4);
  return { yaw, pitch, pace, spin, mishit };
}

/** The kick as struck: turned by the error, its pace and sidespin changed. */
export function applyError(kick: Kick, e: StrikeError): Kick {
  const v = kick.vel;
  const cy = Math.cos(e.yaw);
  const sy = Math.sin(e.yaw);
  const x = v.x * cy - v.z * sy;
  const z = v.x * sy + v.z * cy;
  const flat = Math.hypot(x, z);
  const speed = Math.hypot(flat, v.y) * e.pace;
  const rise = Math.atan2(v.y, flat) + e.pitch;
  const k = flat > 1e-9 ? (Math.cos(rise) * speed) / flat : 0;
  return {
    vel: { x: x * k, y: Math.sin(rise) * speed, z: z * k },
    spin: { x: kick.spin.x, y: kick.spin.y + e.spin, z: kick.spin.z },
    time: kick.time / Math.max(0.5, e.pace),
  };
}
