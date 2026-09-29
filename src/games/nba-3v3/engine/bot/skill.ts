import { BOT_SKILL, type BotLevel, type BotSkill } from "@/games/kit/difficulty/difficulty";

/**
 * The lobby's Computer difficulty, turned into the few knobs the
 * basketball bots read. Hard is the game as it was tuned: sharp timing
 * and quick reads. Easy thinks slower, runs a touch slower and misses
 * the green more often. Training freezes them on the spot.
 */
export interface BotTuning {
  /** False in Training: the bots stand still and never press a button. */
  acts: boolean;
  /** Scales the stick of every computer player. */
  pace: number;
  /** Multiplies how far a release strays from the green. */
  spread: number;
  /** Extra seconds before each decision, on top of the natural pause. */
  think: number;
  /** Extra seconds late on a jump at a shooter. */
  lateJump: number;
  /** Scales how often a defender reaches in. */
  reach: number;
}

export function botTuning(level: BotLevel): BotTuning {
  const s: BotSkill = BOT_SKILL[level];
  if (!s.acts) return { acts: false, pace: 0, spread: 1, think: 0, lateJump: 0, reach: 0 };
  const hard = BOT_SKILL.hard;
  return {
    acts: true,
    pace: s.speed,
    // Hard keeps the tuned spread; each step down widens it.
    spread: 1 + (hard.accuracy - s.accuracy) * 1.1,
    think: Math.max(0, s.reaction - hard.reaction) * 0.35,
    lateJump: Math.max(0, s.reaction - hard.reaction) * 0.18,
    reach: 0.5 + s.accuracy * 0.55,
  };
}
