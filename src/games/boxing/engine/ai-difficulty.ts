import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { AI_LEVELS, type AiLevel } from "./ai";

/**
 * Which rung of AI_LEVELS the computer boxer fights at in each round, for
 * each lobby level. It still gets sharper as the rounds go on. Easy stays
 * on the two gentlest rungs, Medium climbs the whole ladder as the fight
 * was first tuned, and Hard starts one rung up and ends on the sharpest.
 */
const LADDER: Record<Exclude<BotLevel, "training">, { start: number; top: number }> = {
  easy: { start: 0, top: 1 },
  medium: { start: 0, top: 3 },
  hard: { start: 1, top: 4 },
};

/** The computer boxer's level for a round, from the lobby's difficulty. */
export function aiLevelFor(level: BotLevel): (round: number) => AiLevel {
  // Training never throws or defends, so the rung it reads does not matter.
  const { start, top } = level === "training" ? LADDER.easy : LADDER[level];
  return (round) => AI_LEVELS[Math.min(top, start + Math.max(0, round - 1), AI_LEVELS.length - 1)]!;
}

/** False in Training: the computer boxer stands still with its hands down. */
export function aiActs(level: BotLevel): boolean {
  return level !== "training";
}
