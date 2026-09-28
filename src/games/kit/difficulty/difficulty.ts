/**
 * How hard the computer players are. Every game with bots offers the same
 * four levels so the lobby reads the same everywhere. Easy is the default.
 * Training keeps bots in the game but frozen, so players can practise.
 */
export type BotLevel = "easy" | "medium" | "hard" | "training";

export const BOT_LEVELS: readonly BotLevel[] = ["easy", "medium", "hard", "training"];

export const DEFAULT_BOT_LEVEL: BotLevel = "easy";

export const BOT_LEVEL_LABELS: Record<BotLevel, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  training: "Training",
};

/**
 * A shared starting point for tuning. Games map these onto their own knobs
 * (reaction time, aim error, speed) and may override them.
 */
export interface BotSkill {
  /** Seconds before a bot reacts to something new. */
  reaction: number;
  /** 0 is sloppy, 1 is sharp. Scales aim, timing and decision quality. */
  accuracy: number;
  /** Multiplier on bot movement speed. 0 means the bot never moves. */
  speed: number;
  /** False in Training: the bot never acts. */
  acts: boolean;
}

export const BOT_SKILL: Record<BotLevel, BotSkill> = {
  easy: { reaction: 0.6, accuracy: 0.45, speed: 0.8, acts: true },
  medium: { reaction: 0.35, accuracy: 0.7, speed: 0.92, acts: true },
  hard: { reaction: 0.18, accuracy: 0.9, speed: 1, acts: true },
  training: { reaction: Infinity, accuracy: 0, speed: 0, acts: false },
};

export function isBotLevel(value: unknown): value is BotLevel {
  return typeof value === "string" && (BOT_LEVELS as readonly string[]).includes(value);
}
