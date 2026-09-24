import { z } from "zod";

/**
 * The best scores ever shot on this computer. Each round length keeps its
 * own table, since a 45 second round naturally scores more than a 20.
 * Only the pure logic lives here. The host keeps the book in the
 * browser's localStorage.
 */

export const BEST_MAX = 8;

const entrySchema = z.object({
  name: z.string().min(1).max(40),
  score: z.number().int().min(0),
  accuracy: z.number().min(0).max(1),
  seconds: z.number().int().positive(),
  /** When it was set, milliseconds since 1970. */
  at: z.number(),
});
export type BestEntry = z.infer<typeof entrySchema>;

/** Tables keyed by round length in seconds, as a string for JSON. */
export const bookSchema = z.record(z.string(), z.array(entrySchema));
export type BestBook = z.infer<typeof bookSchema>;

/** Reads a stored book, dropping anything malformed rather than failing. */
export function parseBook(raw: unknown): BestBook {
  const parsed = bookSchema.safeParse(raw);
  if (!parsed.success) return {};
  const book: BestBook = {};
  for (const [key, table] of Object.entries(parsed.data)) book[key] = sortTable(table).slice(0, BEST_MAX);
  return book;
}

function sortTable(table: readonly BestEntry[]): BestEntry[] {
  // Older first on a tie, so a score has to be beaten to be pushed down.
  return [...table].sort((a, b) => b.score - a.score || b.accuracy - a.accuracy || a.at - b.at);
}

/**
 * Adds a score to its table. Returns the new book and the entry's place
 * (1 for the top), or null when it did not make the table. Zero scores
 * are never kept: missing everything is not a record.
 */
export function addBest(book: BestBook, entry: BestEntry): { book: BestBook; place: number | null } {
  if (entry.score <= 0) return { book, place: null };
  const key = String(entry.seconds);
  const table = sortTable([...(book[key] ?? []), entry]).slice(0, BEST_MAX);
  const index = table.indexOf(entry);
  return { book: { ...book, [key]: table }, place: index === -1 ? null : index + 1 };
}

export function tableFor(book: BestBook, seconds: number): BestEntry[] {
  return book[String(seconds)] ?? [];
}
