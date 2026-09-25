import type { ShotOutcome } from "./types";
import { clamp, clamp01 } from "./vec";

export interface ShotContext {
  /** Metres to the middle of the goal. */
  distance: number;
  /** Radians off straight on, see shotAngle. */
  angle: number;
  /** The shooter's shooting stat, 0 to 1. */
  shooting: number;
  /** 0 with nobody near, 1 with a defender right on the shooter. */
  pressure: number;
  /** 0 with the keeper set in position, 1 with the keeper stranded or on the floor. */
  keeperOff: number;
  /** The charge bar's level: 0 a placed shot, 1 a full power strike. */
  power: number;
  /** How far off the aim the power can send it, 0 to 1, see shotSpread. */
  spread?: number;
  /** The shooter is already past the keeper, so no save is possible. */
  beaten: boolean;
  /** 1 aimed at the side the keeper left open, -1 straight at the keeper's side, 0 left to the game. */
  placement?: number;
}

export type Odds = Record<ShotOutcome, number>;

export const OUTCOMES: readonly ShotOutcome[] = ["goal", "catch", "parry", "post", "bar", "over", "wide"];

/**
 * How good a chance is, 0 to 1, before the keeper: close, central, a
 * good finisher and time on the ball make it high.
 */
export function shotQuality(c: ShotContext): number {
  const range = Math.min(1, Math.exp(-(c.distance - 4) / 10));
  const angle = 0.5 + 0.5 * Math.cos(Math.min(c.angle, 1.45));
  const skill = 0.5 + 0.5 * c.shooting;
  return clamp01(range * angle * skill * (1 - 0.45 * c.pressure));
}

/**
 * The chance of every outcome, adding up to 1. A placed shot is about
 * one in twenty off the woodwork and one in twenty over; power sprays
 * that, and a red bar balloons it over or drags it wide far more often.
 * Of the shots on target, the chance, the keeper's position and the
 * pace decide goal or save, and hard shots are parried more than caught.
 */
export function shotOdds(c: ShotContext): Odds {
  const quality = shotQuality(c);
  const spread = c.spread ?? 0.2;
  const range = Math.max(0, (c.distance - 14) / 12);
  const touch = 1.35 - c.shooting * 0.7;
  const over = clamp((0.036 * (1 + c.pressure * 0.8 + range) + 0.3 * spread * spread) * touch, 0.015, 0.4);
  const woodwork = clamp(0.045 * (0.85 + 0.3 * (1 - quality)) + 0.02 * spread, 0.03, 0.075);
  const wide = clamp(0.015 + 0.08 * (1 - quality) + (c.angle > 0.95 ? 0.04 : 0) + 0.16 * spread * spread * touch, 0.01, 0.3);
  const onTarget = Math.max(0.2, 1 - over - woodwork - wide);
  // Placing it in the open corner pays off only when the shot goes where it was aimed.
  const aimed = 0.1 * (c.placement ?? 0) * (1 - spread);
  const goalShare = c.beaten ? 1 : clamp(0.36 * quality + 0.25 * c.keeperOff + 0.12 * c.power + aimed, 0.05, 0.85);
  const goal = onTarget * goalShare;
  const save = onTarget - goal;
  const parry = clamp(0.2 + 0.45 * c.power, 0.15, 0.7);
  const total = goal + save + woodwork + over + wide;
  return {
    goal: goal / total,
    catch: (save * (1 - parry)) / total,
    parry: (save * parry) / total,
    post: (woodwork * 0.65) / total,
    bar: (woodwork * 0.35) / total,
    over: over / total,
    wide: wide / total,
  };
}

/** Picks an outcome from the odds with a roll from 0 to 1. */
export function pickOutcome(odds: Odds, roll: number): ShotOutcome {
  let sum = 0;
  for (const outcome of OUTCOMES) {
    sum += odds[outcome];
    if (roll < sum) return outcome;
  }
  return "goal";
}
