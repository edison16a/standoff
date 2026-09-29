import type { BotLevel } from "@/games/kit/difficulty/difficulty";

/**
 * How a computer driver drives at each lobby level. Hard is the driver as
 * it was first tuned. Easy and Medium hold back on pace and are slower to
 * fire items. Training parks the kart on the grid.
 */
export interface KartBotSkill {
  /** False in Training: the kart never moves or uses an item. */
  drives: boolean;
  /** Multiplier on the kart's top speed, on top of the catch up bias. */
  pace: number;
  /** Extra seconds before it thinks about its item again. */
  itemDelay: number;
  /** Chance of a rocket start. */
  rocketStart: number;
}

export const KART_BOT_SKILL: Record<BotLevel, KartBotSkill> = {
  easy: { drives: true, pace: 0.88, itemDelay: 2.5, rocketStart: 0.15 },
  medium: { drives: true, pace: 0.94, itemDelay: 1, rocketStart: 0.3 },
  hard: { drives: true, pace: 1, itemDelay: 0, rocketStart: 0.4 },
  training: { drives: false, pace: 0, itemDelay: Infinity, rocketStart: 0 },
};

/** Players' karts on autopilot, the demo race and the showcase keep the full driver. */
export const FULL_SKILL = KART_BOT_SKILL.hard;
