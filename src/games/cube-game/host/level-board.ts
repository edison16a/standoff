import { localBoards, readBoard, recordEntry, type BoardRef, type BoardStorage, type LeaderEntry } from "@/games/kit/leaderboard";

/**
 * Each level's leaderboard on this computer: every finish, quickest
 * first. A clean finish always takes the level's own length, so what
 * sets runs apart is the time lost to crashes on the way.
 */

export const BOARD_GAME = "cube-game";

export function levelBoard(levelId: string): BoardRef {
  return { game: BOARD_GAME, board: levelId, order: "low" };
}

/** Where one player's finish landed, for the results. */
export interface BoardPlace {
  slot: number;
  /** 1 for the quickest on this computer. */
  rank: number;
  total: number;
  /** Quicker than every earlier finish of this level. */
  best: boolean;
  /** The saved run, to light its row. */
  id: string;
}

/** A finish as the board shows it: 48.3 s, or 1:02.4 past a minute. */
export function formatTime(seconds: number): string {
  const tenths = Math.round(seconds * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = (tenths % 600) / 10;
  return minutes ? `${minutes}:${rest.toFixed(1).padStart(4, "0")}` : `${rest.toFixed(1)} s`;
}

/** The note beside a time: how many tries it took. A run the admin autopilot flew says so instead. */
export function triesTag(attempts: number): string {
  return attempts === 1 ? "1st try" : `${attempts} tries`;
}

/** Saves a finish and says where it landed, with the board as it now stands. */
export function recordFinish(
  levelId: string,
  run: { slot: number; name: string; seconds: number; attempts: number; pilot?: boolean },
  storage: BoardStorage = localBoards(),
): { place: BoardPlace; entries: LeaderEntry[] } {
  const placed = recordEntry(levelBoard(levelId), { name: run.name, value: run.seconds, tag: run.pilot ? "Autopilot" : triesTag(run.attempts) }, storage);
  return {
    place: { slot: run.slot, rank: placed.rank, total: placed.total, best: placed.best, id: placed.entry.id },
    entries: placed.entries,
  };
}

/** A level's board, quickest first. */
export function readLevelBoard(levelId: string, storage: BoardStorage = localBoards()): LeaderEntry[] {
  return readBoard(levelBoard(levelId), storage);
}

/** The line under a win, like "#3 on this computer". */
export function rankLine(place: BoardPlace): string {
  return `#${place.rank} on this computer`;
}
