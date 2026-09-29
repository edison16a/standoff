import { isNamed, type BestEntry } from "../engine/best-scores";
import type { Difficulty } from "../engine/difficulty";
import type { BestStore } from "./best-store";
import type { Round } from "./round";
import type { ResultRow } from "./store";

/**
 * The end of a run: the row for the results card, and the entry for the
 * best scores table. Only a typed name goes on the table, since
 * "Player 1" means someone else next week.
 */
export function resultOf(round: Round, name: string, difficulty: Difficulty, at = Date.now()): { row: ResultRow; entry: BestEntry | null } {
  const run = round.run;
  const row: ResultRow = {
    name: name.trim() || "Player 1",
    difficulty,
    score: Math.floor(run.score),
    coins: run.coins,
    distance: Math.floor(run.runner.distance),
    best: null,
  };
  const entry = isNamed(name, 1) ? { name: row.name, score: row.score, coins: row.coins, distance: row.distance, at } : null;
  return { row, entry };
}

/** Works out the result and writes a named run to the best table, marking its place on it. */
export function recordResult(round: Round, name: string, difficulty: Difficulty, best: BestStore): ResultRow {
  const { row, entry } = resultOf(round, name, difficulty);
  if (entry) row.best = best.add([entry])[0] ?? null;
  return row;
}
