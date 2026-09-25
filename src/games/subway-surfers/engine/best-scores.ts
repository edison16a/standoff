import { z } from "zod";

/**
 * The best runs ever on this computer. Only the pure logic lives here.
 * The host keeps the table in the browser's localStorage.
 */

export const BEST_MAX = 8;

const entrySchema = z.object({
  name: z.string().min(1).max(40),
  score: z.number().int().min(0),
  coins: z.number().int().min(0),
  /** Metres run. */
  distance: z.number().int().min(0),
  /** When it was set, milliseconds since 1970. */
  at: z.number(),
});
export type BestEntry = z.infer<typeof entrySchema>;

/** Reads a stored table, dropping anything malformed rather than failing. */
export function parseTable(raw: unknown): BestEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries = raw.flatMap((item) => {
    const parsed = entrySchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  return sortTable(entries).slice(0, BEST_MAX);
}

function sortTable(table: readonly BestEntry[]): BestEntry[] {
  // Older first on a tie, so a score has to be beaten to be pushed down.
  return [...table].sort((a, b) => b.score - a.score || a.at - b.at);
}

/**
 * Adds a round's runs at once. Returns the new table and each entry's
 * place (1 for the top), or null when it did not make it. A zero score
 * is never kept.
 */
export function addBests(table: readonly BestEntry[], entries: readonly BestEntry[]): { table: BestEntry[]; places: (number | null)[] } {
  const next = sortTable([...table, ...entries.filter((e) => e.score > 0)]).slice(0, BEST_MAX);
  const places = entries.map((entry) => {
    const index = next.indexOf(entry);
    return index === -1 ? null : index + 1;
  });
  return { table: next, places };
}

/** Whether a name was typed, rather than left as the "Player 2" that means someone else next week. */
export function isNamed(name: string, slot: number): boolean {
  const trimmed = name.trim();
  return trimmed !== "" && trimmed.toLowerCase() !== `player ${slot}`;
}
