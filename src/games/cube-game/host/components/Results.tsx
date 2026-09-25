"use client";
import { playerColor } from "@/games/kit/players";
import { LEVELS } from "../../levels";
import { useCubeStore } from "../store";
import { useSession } from "./session-context";

/** After a round: each player's best, attempts and jumps, and where to go next. */
export function Results() {
  const session = useSession();
  const { results, levelId, progress, unlockedNow, practice } = useCubeStore();
  const index = LEVELS.findIndex((l) => l.info.id === levelId);
  const level = LEVELS[index]?.info;
  const hasNext = index + 1 < LEVELS.length && index + 1 < progress.unlocked;
  const everyone = results.every((row) => row.finished);
  return (
    <div className="cg-center">
      <section className="cg-results" aria-label="Results">
        <p className="cg-results__level">{level?.name}</p>
        <h2 className="cg-results__title">{everyone ? "Level complete" : "Round over"}</h2>
        {unlockedNow && <p className="cg-results__unlock">{unlockedNow} is open</p>}
        <table className="cg-results__table">
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col">Best</th>
              <th scope="col">Attempts</th>
              <th scope="col">Jumps</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.slot}>
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
