import type { RunOptions } from "./run";
import { MOVE_GAP_S } from "./tuning";
import { USUAL_YARD, type Yard } from "./yard";

/**
 * How hard a run starts. The pace and how busy the yard is both follow
 * distance, so a harder run simply starts as if the runner were already
 * some way in. Demon also tightens the yard itself. The score starts at
 * zero on every level, and each level multiplies every point it earns.
 */
export type Difficulty = "easy" | "medium" | "hard" | "demon";

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard", "demon"];

export const DEFAULT_DIFFICULTY: Difficulty = "easy";

export interface DifficultySpec {
  label: string;
  /**
   * Metres of head start on the pace. Measured with the test bot, which
   * plays like a person on camera: a score of about 7,000 comes near
   * 1,600 metres and about 20,000 near 3,000 metres.
   */
  headStart: number;
  /** Multiplies every point: distance, coins and power ups. */
  multiplier: number;
  yard: Yard;
}

/**
 * Demon starts at top speed and runs a tenth faster than it, with the
 * hardest patterns most of the time, shorter breaks between them and a
 * tenth of a second less between moves. The camera bot still clears it.
 */
const DEMON_YARD: Yard = { pace: 1.1, moveGap: MOVE_GAP_S - 0.1, busiest: 1.5, breath: 0.25 };

export const DIFFICULTY: Record<Difficulty, DifficultySpec> = {
  easy: { label: "Easy", headStart: 0, multiplier: 1, yard: USUAL_YARD },
  medium: { label: "Medium", headStart: 1600, multiplier: 1.5, yard: USUAL_YARD },
  hard: { label: "Hard", headStart: 3000, multiplier: 2, yard: USUAL_YARD },
  demon: { label: "Demon", headStart: 6000, multiplier: 3, yard: DEMON_YARD },
};

/** What a run on this level is built with. */
export function difficultyRun(difficulty: Difficulty): Pick<RunOptions, "headStart" | "yard" | "scoreScale"> {
  const spec = DIFFICULTY[difficulty];
  return { headStart: spec.headStart, yard: spec.yard, scoreScale: spec.multiplier };
}

/** A multiplier as it reads on screen, like "x1.5". */
export function multiplierText(multiplier: number): string {
  return `x${Number(multiplier.toFixed(2))}`;
}

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value);
}
