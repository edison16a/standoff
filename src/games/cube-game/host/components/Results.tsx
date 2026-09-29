"use client";
import { playerColor } from "@/games/kit/players";
import { LEVELS } from "../../levels";
import { ordinal, verdict } from "../race";
import { useCubeStore, type ResultRow } from "../store";
import { useSession } from "./session-context";

/** How the title reads: a lone player's level, or who won the race. */
function title(results: readonly ResultRow[]): string {
  if (results.length < 2) return results.every((row) => row.finished) ? "Level complete" : "Round over";
  const race = verdict(results.map((row) => row.place));
  if (race.kind === "win") return `Player ${race.slot} wins!`;
  return race.kind === "tie" ? "Dead heat!" : "No winner";
}

/** After a round: who won a race, each player's place, best, attempts and jumps, and where to go next. */
export function Results() {
  const session = useSession();
  const { results, levelId, practice } = useCubeStore();
  const index = LEVELS.findIndex((l) => l.info.id === levelId);
  const level = LEVELS[index]?.info;
  const hasNext = index + 1 < LEVELS.length;
  const race = results.length > 1;
  return (
    <div className="cg-center">
      <section className="cg-results" aria-label="Results">
        <p className="cg-results__level">{level?.name}</p>
        <h2 className="cg-results__title">{title(results)}</h2>
        <table className="cg-results__table">
          <thead>
            <tr>
              <th scope="col">Player</th>
              {race && <th scope="col">Place</th>}
              <th scope="col">Best</th>
              <th scope="col">Attempts</th>
              <th scope="col">Jumps</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.slot} className={row.place === 1 ? "cg-results__row--won" : undefined}>
                <th scope="row">
                  <span className="cg-dot" style={{ background: playerColor(row.slot) }} aria-hidden="true" />
                  Player {row.slot}
                  {race && row.place === 1 && <span className="cg-results__trophy">Winner</span>}
                </th>
                {race && <td>{row.place === null ? "Did not finish" : ordinal(row.place)}</td>}
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
            Play again
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
