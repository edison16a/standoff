"use client";
import { lazy, Suspense } from "react";
import { playerColor } from "@/games/kit/players";
import { ordinal } from "@/games/kit/split/finish";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import { LEVELS } from "../../levels";
import { standFor } from "../../render/victory/finish-stage";
import { headline } from "../headline";
import { nameOf } from "../names";
import { useCubeStore } from "../store";
import { useSession } from "./session-context";

// The celebration's 3D scene loads with the results, not with the level.
const FinishCanvas = lazy(() => import("./results/FinishCanvas"));

/**
 * After a round: the finish celebration across the whole screen, the
 * winner's cube on the podium's top step with a gold cup and the other
 * player second, or a player alone on a pedestal, with the name big
 * across the top. Once the name has landed, each player's place, best,
 * attempts and jumps and the ways on come up in the bottom left corner,
 * clear of the camera's picture in the bottom right.
 */
export function Results() {
  const session = useSession();
  const { results, winner, levelId, practice, names } = useCubeStore();
  const index = LEVELS.findIndex((l) => l.info.id === levelId);
  const level = LEVELS[index]?.info;
  const hasNext = index + 1 < LEVELS.length;
  const race = results.length > 1;
  // The race's order, leader first. Alone there is one row.
  const rows = [...results].sort((a, b) => a.place - b.place || a.slot - b.slot);
  if (rows.length === 0) return null;
  const top = headline(rows, winner, level?.name ?? "");
  return (
    <div className="cg-results">
      <Suspense fallback={null}>
        <FinishCanvas stand={standFor(rows)} levelId={levelId} />
      </Suspense>
      <VictoryOverlay eyebrow={top.eyebrow} names={top.slots.map((slot) => ({ name: nameOf(names, slot), colour: playerColor(slot) }))} subtitle={top.subtitle} />
      <section className="cg-results__panel" aria-label="Results">
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
                  {nameOf(names, row.slot)}
                </th>
                <td>{row.finished ? "100%" : `${row.best}%`}</td>
                <td>{row.attempts}</td>
                <td>{row.jumps}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {race && winner === null && !rows.some((row) => row.finished) && <p className="cg-results__note">Nobody reached the end, so the order is by how far each got.</p>}
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
