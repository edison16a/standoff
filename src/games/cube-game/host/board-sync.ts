import { onBoardsChange } from "@/games/kit/leaderboard";
import { readLevelBoard } from "./level-board";
import { useCubeStore as store } from "./store";

/** Loads the chosen level's leaderboard into the store. */
export function loadBoard(levelId = store.getState().levelId): void {
  const board = readLevelBoard(levelId);
  // A row wiped by Clear leaderboards takes its rank on the results with it.
  const placed = store.getState().placed.filter((p) => board.some((entry) => entry.id === p.id));
  store.setState({ board, placed });
}

/**
 * Keeps the store's leaderboard in step with this computer's, as when
 * Settings clears every board or another tab saves a run. Returns the
 * way to stop.
 */
export function syncBoard(): () => void {
  loadBoard();
  return onBoardsChange(() => loadBoard());
}
