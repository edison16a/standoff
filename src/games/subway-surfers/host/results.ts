import { isNamed, type BestEntry } from "../engine/best-scores";
import type { BestStore } from "./best-store";
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

/** Works out the results and writes the named runs to the best table, marking each row's place on it. */
export function recordResults(round: Round, names: readonly string[], best: BestStore): { rows: ResultRow[]; winner: number | null } {
  const { rows, winner, entries } = resultsOf(round, names);
  const places = best.add(entries.map((e) => e.entry));
  entries.forEach((e, i) => (rows[e.slot - 1]!.best = places[i] ?? null));
  return { rows, winner };
}
