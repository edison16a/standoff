"use client";
import { playerColor } from "@/games/kit/players";
import { ordinal } from "@/games/kit/split/finish";
import { LEVELS } from "../../levels";
import { useCubeStore, type ResultRow } from "../store";
import { useSession } from "./session-context";

/** The results card's headline: the level alone, or who won the race. */
function title(results: readonly ResultRow[], winner: number | null): string {
  if (results.length === 1) return results[0]!.finished ? "Level complete" : "Round over";
  if (winner) return `Player ${winner} wins`;
  return results.filter((row) => row.finished).length > 1 ? "Dead heat" : "Round over";
}

/** After a round: who won, each player's best, attempts and jumps, and where to go next. */
export function Results() {
  const session = useSession();
  const { results, winner, levelId, practice } = useCubeStore();
  const index = LEVELS.findIndex((l) => l.info.id === levelId);
  const level = LEVELS[index]?.info;
  const hasNext = index + 1 < LEVELS.length;
  const race = results.length > 1;
  // The race's order, leader first. Alone there is one row.
  const rows = [...results].sort((a, b) => a.place - b.place || a.slot - b.slot);
  return (
    <div className="cg-center">
      <section className="cg-results" aria-label="Results">
        <p className="cg-results__level">{race ? `1v1 on ${level?.name ?? ""}` : level?.name}</p>
        <h2 className="cg-results__title" style={winner ? { color: playerColor(winner) } : undefined}>
          {title(results, winner)}
        </h2>
        {race && !winner && <p className="cg-results__note">Nobody reached the end first, so the order is by how far each got.</p>}
        <table className="cg-results__table">
          <thead>
            <tr>
              {race && <th scope="col">Place</th>}
              <th scope="col">Player</th>
              <th scope="col">Best</th>
              <th scope="col">Attempts</th>
              <th scope="col">Jumps</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slot} className={race && row.slot === winner ? "cg-results__winner" : undefined}>
                {race && <td>{ordinal(row.place)}</td>}
                <th scope="row">
                  <span className="cg-dot" style={{ background: playerColor(row.slot) }} aria-hidden="true" />
                  Player {row.slot}
                </th>
                <td>{row.finished ? "100%" : `${row.best}%`}</td>
                <td>{row.attempts}</td>
                <td>{row.jumps}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {practice && <p className="cg-results__note">Practice runs do not count toward your best.</p>}
        <div className="cg-results__actions">
          <button type="button" className="cg-button cg-button--quiet" onClick={() => session.toMenu()}>
            Levels
          </button>
          <button type="button" className="cg-button cg-button--quiet" onClick={() => session.retry()}>
            {race ? "Rematch" : "Play again"}
          </button>
          {hasNext && (
            <button type="button" className="cg-button" onClick={() => session.next()}>
              Next level
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
