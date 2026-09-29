"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { clearBoards, countRuns, onBoardsChange } from "@/games/kit/leaderboard/store";
import "./leaderboards.css";

/**
 * Clear leaderboards: wipes every game's saved runs on this computer.
 * It asks once more first, inside the panel, since a board can hold
 * months of runs and there is no undo.
 */
export function LeaderboardSection() {
  const [runs, setRuns] = useState(countRuns);
  const [asking, setAsking] = useState(false);
  const [cleared, setCleared] = useState(false);
  // A run finishing behind the panel, or in another tab, updates the count.
  useEffect(() => onBoardsChange(() => setRuns(countRuns())), []);

  const clear = () => {
    clearBoards();
    setAsking(false);
    setCleared(true);
  };

  return (
    <>
      <p className="settings__title">
        <Icon name="trophy" />
        Leaderboards
      </p>
      {asking ? (
        <div className="settings__confirm" role="alertdialog" aria-label="Clear leaderboards?">
          <span className="settings__confirm-text">Clear every game&apos;s leaderboards on this computer? This cannot be undone.</span>
          <div className="settings__confirm-actions">
            <button type="button" className="btn settings__danger" onClick={clear}>
              Clear
            </button>
            <button type="button" className="btn" onClick={() => setAsking(false)} autoFocus>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn--block" disabled={runs === 0} onClick={() => setAsking(true)}>
          <Icon name="close" />
          Clear leaderboards
        </button>
      )}
      <span className="settings__hint">{hint(runs, cleared)}</span>
    </>
  );
}

function hint(runs: number, cleared: boolean): string {
  if (runs > 0) return `${runs.toLocaleString()} ${runs === 1 ? "run" : "runs"} saved on this computer.`;
  return cleared ? "Leaderboards cleared." : "No runs saved yet.";
}
