import { BOT_SKILL, type BotLevel, type BotSkill } from "@/games/kit/difficulty/difficulty";

/**
 * The shared difficulty levels turned into football knobs. Reaction
 * sets how often a bot rethinks, accuracy how well it reads the field,
 * tackles and kicks, and speed how hard it runs. Training bots stand
 * still and never act.
 */
export interface FootballSkill extends BotSkill {
  /** Chance a bot in range goes for the tackle each time it thinks. */
  tackle: number;
  /** Chance a computer ball carrier jukes a lunging tackler. */
  juke: number;
  /** How far over the top of a receiver a computer defender plays, metres. */
  cushion: number;
}

export function botSkill(level: BotLevel): FootballSkill {
  const base = BOT_SKILL[level];
  return {
    ...base,
    reaction: Number.isFinite(base.reaction) ? base.reaction : 1,
    tackle: 0.35 + base.accuracy * 0.6,
    juke: base.accuracy * 0.7,
    cushion: 1 + (1 - base.accuracy) * 2.5,
  };
}
