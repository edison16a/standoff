import { z } from "zod";
import { localBoards, onBoardsChange, readBoard, recordEntry, type BoardStorage, type LeaderEntry } from "@/games/kit/leaderboard";
import { RUNS_BOARD } from "./results";

/** Where the best runs table lived before the leaderboard: its top eight named runs. */
const OLD_KEY = "standoff:subway-surfers:best";
const oldEntry = z.object({ name: z.string().min(1).max(40), score: z.number().int().min(0), at: z.number() });

/**
 * This computer's leaderboard, for the session: read at the start and
 * read again whenever it changes, as when Clear leaderboards wipes it
 * from the Settings panel or another tab saves a run.
 */
export class RunBoard {
  private readonly stop: () => void;

  constructor(onChange: (entries: LeaderEntry[]) => void) {
    importOldBest();
    onChange(readBoard(RUNS_BOARD));
    this.stop = onBoardsChange(() => onChange(readBoard(RUNS_BOARD)));
  }

  dispose(): void {
    this.stop();
  }
}

/** Moves the old best runs table onto the leaderboard once, then forgets it, so nobody's record is lost. */
export function importOldBest(storage: BoardStorage = localBoards()): number {
  let moved = 0;
  try {
    const raw = storage.getItem(OLD_KEY);
    if (raw === null) return 0;
    const old: unknown = JSON.parse(raw);
    for (const item of Array.isArray(old) ? old : []) {
      const entry = oldEntry.safeParse(item);
      if (!entry.success) continue;
      recordEntry(RUNS_BOARD, { name: entry.data.name, value: entry.data.score, at: entry.data.at }, storage);
      moved++;
    }
    storage.removeItem(OLD_KEY);
  } catch {
    // Unreadable or blocked storage: the old table stays where it is and the game plays on.
  }
  return moved;
}
