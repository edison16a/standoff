"use client";
import { LeaderboardList } from "@/games/kit/leaderboard";
import { formatTime, rankLine } from "../../level-board";
import { nameOf } from "../../names";
import { useCubeStore } from "../../store";

/**
 * Where a finish landed on this computer's leaderboard for the level:
 * "#3 on this computer", a New best note when it beat every earlier
 * finish, and the list with the run lit up. Only shown after a finish.
 */
export function BoardPanel() {
  const { board, placed, names, results } = useCubeStore();
  if (placed.length === 0) return null;
  const race = results.length > 1;
  const ordered = [...placed].sort((a, b) => a.rank - b.rank);
  return (
    <div className="cg-board">
      {ordered.map((place) => (
        <p key={place.slot} className="cg-board__rank">
          {race && <span className="cg-board__who">{nameOf(names, place.slot)}</span>}
          <strong>{rankLine(place)}</strong>
          {place.best && <span className="cg-board__best">New best</span>}
        </p>
      ))}
      <LeaderboardList className="cg-board__list" title="Quickest finishes" entries={board} highlight={ordered[0]!.id} format={formatTime} />
    </div>
  );
}
