import { BOT_SKILL, type BotSkill } from "@/games/kit/difficulty/difficulty";
import type { MatchState } from "./types";

/** The level's shared numbers: reaction, accuracy, speed, and whether bots act at all. */
export function botSkill(state: MatchState): BotSkill {
  return BOT_SKILL[state.options.level];
}

/**
 * How much slower than Hard a computer player thinks. Hard plays at the
 * match's own tempo; the others take longer to react, but not so long
 * that they look asleep.
 */
export function thinkScale(state: MatchState): number {
  const skill = botSkill(state);
  if (!skill.acts) return Infinity;
  return 0.5 + (0.5 * skill.reaction) / BOT_SKILL.hard.reaction;
}

/** 0 for Hard up to about 0.55 for Easy: how far off a computer player's aim and choices drift. */
export function sloppiness(state: MatchState): number {
  return 1 - botSkill(state).accuracy;
}
