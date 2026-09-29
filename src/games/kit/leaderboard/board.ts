import { z } from "zod";

/**
 * A leaderboard is a list of finished runs ranked by one number, kept on
 * this computer. Only the pure logic lives here: ranking, placing a new
 * run and reading a stored list. See `store.ts` for where it is kept.
 */

/** "high" ranks bigger first, for scores. "low" ranks smaller first, for finish times. */
export type BoardOrder = "high" | "low";

/** The longest name and tag a board keeps. Longer ones are cut to fit when a run is saved. */
export const TEXT_MAX = 40;

const entrySchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(TEXT_MAX),
  value: z.number().finite(),
  /** When it was set, milliseconds since 1970. */
  at: z.number().finite(),
  tag: z.string().max(TEXT_MAX).optional(),
});

export interface LeaderEntry {
  /** Unique on its board, so the row of a run just played can be found and lit up. */
  id: string;
  name: string;
  /** What the board ranks by: a score, or a time in seconds. */
  value: number;
  at: number;
  /** A short note beside the value, such as the difficulty it was played on. */
  tag?: string;
}

/** Where a run landed on its board. */
export interface Placement {
  entry: LeaderEntry;
  /** 1 for the top. */
  rank: number;
  /** Runs on the board, this one included. */
  total: number;
  /** Ahead of every earlier run. A tie is not a new best, since the older run keeps its place. */
  best: boolean;
  /** The whole board, ranked, with this run in it. */
  entries: LeaderEntry[];
}

/** Whether `a` ranks ahead of `b`. An older run wins a tie, so a score has to be beaten to be passed. */
function ahead(a: LeaderEntry, b: LeaderEntry, order: BoardOrder): number {
  const by = order === "high" ? b.value - a.value : a.value - b.value;
  return by || a.at - b.at;
}

export function rankEntries(entries: readonly LeaderEntry[], order: BoardOrder): LeaderEntry[] {
  return [...entries].sort((a, b) => ahead(a, b, order));
}

/** Adds a run to an already ranked board and says where it landed. */
export function placeEntry(ranked: readonly LeaderEntry[], entry: LeaderEntry, order: BoardOrder): Placement {
  // The board is ranked already, so the new run slots in after everything that beats or ties it.
  let index = ranked.findIndex((other) => ahead(entry, other, order) < 0);
  if (index === -1) index = ranked.length;
  const entries = [...ranked.slice(0, index), entry, ...ranked.slice(index)];
  return { entry, rank: index + 1, total: entries.length, best: index === 0, entries };
}

/** Reads a stored board, dropping anything malformed rather than failing, and ranks it. */
export function parseBoard(raw: unknown, order: BoardOrder): LeaderEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries = raw.flatMap((item) => {
    const parsed = entrySchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  return rankEntries(entries, order);
}

/**
 * A run as it will be saved: the name and tag cut to fit, a blank name
 * as "Player", so a saved run always reads back rather than vanishing.
 */
export function newEntry(run: { name: string; value: number; tag?: string; at: number }, random: () => number = Math.random): LeaderEntry {
  const name = run.name.trim().slice(0, TEXT_MAX) || "Player";
  const tag = run.tag?.trim().slice(0, TEXT_MAX);
  return { id: newEntryId(run.at, random), name, value: run.value, at: run.at, ...(tag ? { tag } : {}) };
}

/** A fresh id for a run: its time plus a little randomness, so two runs in one millisecond still differ. */
export function newEntryId(at: number, random: () => number = Math.random): string {
  return `${Math.floor(at).toString(36)}${Math.floor(random() * 36 ** 5).toString(36).padStart(5, "0")}`;
}
