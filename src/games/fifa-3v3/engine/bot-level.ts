import { BOT_SKILL, type BotSkill } from "@/games/kit/difficulty/difficulty";
import type { MatchState } from "./types";

/** The computer players' skill for this match. The engine's own default is Hard, the full strength play. */
export function botSkill(state: MatchState): BotSkill {
  return BOT_SKILL[state.options.botLevel ?? "hard"];
}

/**
 * Extra thinking time on top of a bot's natural pause between decisions,
 * so an Easy bot reacts a beat late and a Hard one at once.
 */
export function thinkDelay(skill: BotSkill): number {
  if (!Number.isFinite(skill.reaction)) return Infinity;
  return Math.max(0, skill.reaction - BOT_SKILL.hard.reaction) * 0.5;
}

/** How far off a bot's chosen spot on goal can drift, in metres. Sloppier bots miss their corner. */
export function aimError(skill: BotSkill): number {
  return (1 - skill.accuracy) * 1.6;
}
