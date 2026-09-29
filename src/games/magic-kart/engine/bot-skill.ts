import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import type { Kart } from "./kart";

/** The knobs a computer driver's difficulty turns. */
export interface KartBotSkill {
  /** Multiplier on the kart's top speed. */
  pace: number;
  /** Most extra speed the catch up gives a computer far behind the players. */
  catchUp: number;
  /** Multiplier on how hard it steers at its line. Lower cuts bends wider. */
  steer: number;
  /** Multiplier on the wait before it thinks about its item again. */
  itemPatience: number;
  /** False in Training: the kart sits on the grid and never drives. */
  acts: boolean;
}

/**
 * Hard is the driver as it always was. Easy and Medium hold back on top
 * speed and on the catch up, so a new player can win, and steer a little
 * lazily and use items less often, so they feel less sharp too.
 */
export const KART_BOT_SKILL: Record<BotLevel, KartBotSkill> = {
  easy: { pace: 0.88, catchUp: 0.04, steer: 0.8, itemPatience: 2.2, acts: true },
  medium: { pace: 0.94, catchUp: 0.08, steer: 0.9, itemPatience: 1.5, acts: true },
  hard: { pace: 1, catchUp: 0.12, steer: 1, itemPatience: 1, acts: true },
  training: { pace: 0, catchUp: 0, steer: 0, itemPatience: Infinity, acts: false },
};

export const FULL_SKILL = KART_BOT_SKILL.hard;

/**
 * The skill that drives this kart right now. Difficulty is for computer
 * karts in the race only: a player's kart on autopilot, and every lap of
 * honour, drive at full skill. Training karts stay parked to the end.
 */
export function skillFor(kart: Kart, level: BotLevel, raceOver: boolean): KartBotSkill {
  if (kart.seat !== null) return FULL_SKILL;
  if (level !== "training" && (kart.race.finished || raceOver)) return FULL_SKILL;
  return KART_BOT_SKILL[level];
}

/**
 * A computer kart's share of top speed. Each kart differs a little, it
 * eases off when far ahead of the best player and pushes when far behind,
 * up to its skill's catch up. The gap is in metres of race progress.
 */
export function computerBias(kartId: number, gap: number, skill: KartBotSkill): number {
  return (0.96 + (kartId % 3) * 0.015) * skill.pace * (1 + Math.max(-0.1, Math.min(skill.catchUp, gap / 300)));
}
