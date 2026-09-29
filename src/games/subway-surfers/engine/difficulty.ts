/**
 * How hard a run starts. The pace and how busy the yard is both follow
 * distance, so a harder run simply starts as if the runner were already
 * this many metres in. The score still starts at zero.
 */
export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

export const DEFAULT_DIFFICULTY: Difficulty = "easy";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/**
 * Metres of head start on the pace. Measured with the test bot, which
 * plays like a person on camera: a score of about 7,000 comes near
 * 1,600 metres and about 20,000 near 3,000 metres.
 */
export const HEAD_START: Record<Difficulty, number> = {
  easy: 0,
  medium: 1600,
  hard: 3000,
};

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value);
}
