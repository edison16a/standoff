import { isNamed, type BestEntry } from "../engine/best-scores";
import type { Round } from "./round";
import type { ResultRow } from "./store";

/**
 * The end of a round: each player's run, the winner when two ran, and
 * the runs that may go on the best scores table. Only players whose name
 * was typed go on it, since "Player 2" means someone else next week.
 */
export function resultsOf(round: Round, names: readonly string[], at = Date.now()): { rows: ResultRow[]; winner: number | null; entries: { slot: number; entry: BestEntry }[] } {
  const rows: ResultRow[] = round.seats.map((seat, i) => ({
    slot: i + 1,
    name: names[i]?.trim() || `Player ${i + 1}`,
    score: Math.floor(seat.run.score),
    coins: seat.run.coins,
    distance: Math.floor(seat.run.runner.distance),
    best: null,
  }));
  let winner: number | null = null;
  if (rows.length === 2 && rows[0]!.score !== rows[1]!.score) winner = rows[0]!.score > rows[1]!.score ? 1 : 2;
  const entries = rows
    .filter((row) => isNamed(names[row.slot - 1] ?? "", row.slot))
    .map((row) => ({ slot: row.slot, entry: { name: row.name, score: row.score, coins: row.coins, distance: row.distance, at } }));
  return { rows, winner, entries };
}
