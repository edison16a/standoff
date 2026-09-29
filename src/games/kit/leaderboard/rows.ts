import type { LeaderEntry } from "./board";

/** One line of a drawn board: a run with its rank, or a gap standing for runs left out. */
export type BoardLine = { kind: "run"; rank: number; entry: LeaderEntry } | { kind: "gap"; skipped: number };

/**
 * The lines to draw for a board that may hold thousands of runs. A short
 * board is drawn whole. A long one keeps its top, then a gap, then the
 * runs around the one to light up, so the list stays quick to draw and
 * the player's own row is always in it.
 */
export function boardLines(entries: readonly LeaderEntry[], highlight: string | null, max = 200, around = 20): BoardLine[] {
  const run = (index: number): BoardLine => ({ kind: "run", rank: index + 1, entry: entries[index]! });
  const target = highlight === null ? -1 : entries.findIndex((entry) => entry.id === highlight);
  if (entries.length <= max) return entries.map((_, i) => run(i));
  const top = Math.max(1, max - 2 * around - 1);
  if (target < top + around) return [...range(0, max).map(run), gap(entries.length - max)];
  const from = target - around;
  const to = Math.min(entries.length, target + around + 1);
  const lines = [...range(0, top).map(run)];
  if (from > top) lines.push(gap(from - top));
  lines.push(...range(from, to).map(run));
  if (to < entries.length) lines.push(gap(entries.length - to));
  return lines;
}

function gap(skipped: number): BoardLine {
  return { kind: "gap", skipped };
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);
}
