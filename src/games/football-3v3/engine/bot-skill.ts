import { BOT_SKILL, type BotSkill } from "@/games/kit/difficulty/difficulty";
import { isHuman } from "./athlete";
import type { Athlete, MatchState } from "./types";

/** The level's shared numbers: reaction, accuracy, speed, and whether bots act at all. */
export function botSkill(state: MatchState): BotSkill {
  return BOT_SKILL[state.options.level];
}

export function isBot(a: Athlete): boolean {
  return !isHuman(a);
}

/** 0 for a sharp bot up to about 0.55 for Easy: how far off a computer's aim and choices drift. */
export function sloppiness(state: MatchState): number {
  return 1 - botSkill(state).accuracy;
}
