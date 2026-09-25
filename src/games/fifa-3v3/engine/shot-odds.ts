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
  /** 0 a placed tap, 1 a full power strike. */
  power: number;
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
  const range = Math.min(1, Math.exp(-(c.distance - 5) / 12));
  const angle = 0.5 + 0.5 * Math.cos(Math.min(c.angle, 1.45));
  const skill = 0.5 + 0.5 * c.shooting;
  return clamp01(range * angle * skill * (1 - 0.45 * c.pressure));
}

/**
 * The chance of every outcome, adding up to 1. Roughly one shot in
 * twenty hits the woodwork and one in twenty flies over, more when
 * blasted from range under pressure. Of the shots on target, the chance
 * and the keeper's position decide goal or save, and hard shots are
 * parried back into play more often than caught.
 */
export function shotOdds(c: ShotContext): Odds {
  const quality = shotQuality(c);
  const range = Math.max(0, (c.distance - 12) / 10);
  const over = clamp(0.05 * (1 + c.power * 0.7 + c.pressure * 0.8 + range) * (1.35 - c.shooting * 0.7), 0.02, 0.16);
  const woodwork = clamp(0.05 * (0.85 + 0.3 * (1 - quality)), 0.035, 0.07);
  const wide = clamp(0.015 + 0.09 * (1 - quality) + (c.angle > 0.95 ? 0.04 : 0), 0.01, 0.16);
  const onTarget = 1 - over - woodwork - wide;
  const goalShare = c.beaten ? 1 : clamp(0.05 + 0.72 * quality + 0.3 * c.keeperOff + 0.06 * c.power + 0.08 * (c.placement ?? 0), 0.08, 0.93);
  const goal = onTarget * goalShare;
  const save = onTarget - goal;
  const parry = clamp(0.3 + 0.45 * c.power, 0.2, 0.8);
  return {
    goal,
    catch: save * (1 - parry),
    parry: save * parry,
    post: woodwork * 0.65,
    bar: woodwork * 0.35,
    over,
    wide,
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
