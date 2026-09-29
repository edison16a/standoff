import { BOT_SKILL, type BotLevel } from "@/games/kit/difficulty/difficulty";

/** A time range: at least `min`, plus up to `spread` more at random. */
export interface Span {
  min: number;
  spread: number;
}

/** How the computer fencer plays at one difficulty. */
export interface BotTactics {
  /** False in Training: it stands on its mark in guard and never swings. */
  acts: boolean;
  /** Time between its attacks, so the player gets a turn. */
  attackEvery: Span;
  /** How long it takes to see a swing coming and get its blade in the way. */
  reaction: Span;
  /** Share of the player's swings it tries to block. */
  blockChance: number;
  /** Stretches every attack in time. Above 1 swings are slower and easier to read. */
  tempo: number;
  /** Share of full walking speed its footwork uses. */
  footwork: number;
}

/** Attack rhythm per level. Easy leaves long gaps so a new player can find their feet. */
const CADENCE: Record<BotLevel, Span> = {
  easy: { min: 1700, spread: 1800 },
  medium: { min: 1000, spread: 1400 },
  hard: { min: 550, spread: 800 },
  training: { min: Infinity, spread: 0 },
};

/**
 * Maps the shared difficulty levels onto the fencer's own knobs. The kit's
 * reaction and accuracy drive how quickly and how often it blocks and how
 * crisp its swings are, so every game's Hard feels about as hard.
 */
export function botTactics(level: BotLevel): BotTactics {
  const skill = BOT_SKILL[level];
  const reactionMs = skill.acts ? skill.reaction * 1000 : Infinity;
  return {
    acts: skill.acts,
    attackEvery: CADENCE[level],
    reaction: { min: reactionMs * 0.5, spread: reactionMs * 0.5 },
    blockChance: skill.acts ? skill.accuracy * 0.8 : 0,
    tempo: 1 + (1 - skill.accuracy) * 0.6,
    footwork: skill.speed,
  };
}
