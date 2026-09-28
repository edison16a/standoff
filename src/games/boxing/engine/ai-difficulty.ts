import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { AI_LEVELS, type AiLevel } from "./ai";

/** How one difficulty bends the round by round table in `ai.ts`. */
interface Tilt {
  /** Multiplier on the telegraph. Longer is easier to read. */
  windup: number;
  /** Multiplier on the pause between attacks. */
  gap: number;
  /** Multiplier on the chances to block, dodge, counter and combo. */
  sharp: number;
  /** Counts added to when it gets up. Positive stays down longer. */
  getUp: number;
}

/** Medium is the table as tuned. Easy and Hard lean either side of it. */
const TILTS: Record<Exclude<BotLevel, "training">, Tilt> = {
  easy: { windup: 1.2, gap: 1.35, sharp: 0.6, getUp: 1 },
  medium: { windup: 1, gap: 1, sharp: 1, getUp: 0 },
  hard: { windup: 0.88, gap: 0.8, sharp: 1.25, getUp: -1 },
};

/** Chances never reach certainty, so every punch can land sometimes. */
const MAX_CHANCE = 0.8;

const range = ([low, high]: readonly [number, number], k: number, add = 0): [number, number] => [low * k + add, high * k + add];

/** A table row seen through one difficulty. */
export function tilt(row: AiLevel, level: Exclude<BotLevel, "training">): AiLevel {
  const t = TILTS[level];
  const chance = (p: number) => Math.min(MAX_CHANCE, p * t.sharp);
  const count = (pair: readonly [number, number]) => range(pair, 1, t.getUp).map((n) => Math.max(1, Math.min(9, n))) as [number, number];
  return {
    windup: range(row.windup, t.windup),
    gap: range(row.gap, t.gap),
    block: chance(row.block),
    dodge: chance(row.dodge),
    counter: chance(row.counter),
    combo: chance(row.combo),
    getUp: [count(row.getUp[0]), count(row.getUp[1])],
  };
}

export interface BoxerSkill {
  /** The computer's settings for a round, from 1. */
  levelFor(round: number): AiLevel;
  /** False in Training: no punches, no defence and no footwork. */
  acts: boolean;
}

/** The computer boxer for one difficulty. It still gets sharper every round. */
export function boxerSkill(level: BotLevel): BoxerSkill {
  const row = (round: number) => AI_LEVELS[Math.max(1, Math.min(AI_LEVELS.length, round)) - 1]!;
  if (level === "training") return { levelFor: row, acts: false };
  const rows = AI_LEVELS.map((r) => tilt(r, level));
  return { levelFor: (round) => rows[Math.max(1, Math.min(rows.length, round)) - 1]!, acts: true };
}
