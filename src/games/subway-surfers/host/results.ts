import { localBoards, recordEntry, type BoardRef, type BoardStorage } from "@/games/kit/leaderboard";
import { DIFFICULTY, type Difficulty } from "../engine/difficulty";
import type { Round } from "./round";
import { shownName, type InputMode, type ResultRow } from "./store";

/** Every finished run on this computer, ranked by final score. */
export const RUNS_BOARD: BoardRef = { game: "subway-surfers", board: "runs", order: "high" };

/** The note on a leaderboard row: the level, and the keyboard when it was played with keys. */
export function boardTag(difficulty: Difficulty, input: InputMode): string {
  const label = DIFFICULTY[difficulty].label;
  return input === "keyboard" ? `${label}, keys` : label;
}

/**
 * The end of a run: saves it to the leaderboard, whatever its score and
 * whether or not a name was typed, and returns the row for the results.
 */
export function recordResult(round: Round, name: string, input: InputMode, storage: BoardStorage = localBoards(), at = Date.now()): ResultRow {
  const run = round.run;
  const score = Math.floor(run.score);
  // Coins and power ups score whole points, so the running share takes up the rounding.
  const coins = Math.round(run.points.coins);
  const powers = Math.round(run.points.powers);
  const placed = recordEntry(RUNS_BOARD, { name: shownName(name), value: score, tag: boardTag(round.difficulty, input), at }, storage);
  return {
    name: shownName(name),
    difficulty: round.difficulty,
    input,
    score,
    coins: run.coins,
    distance: Math.floor(run.runner.distance),
    points: { running: Math.max(0, score - coins - powers), coins, powers },
    rank: placed.rank,
    total: placed.total,
    best: placed.best,
    entryId: placed.entry.id,
  };
}
