"use client";
import { DIFFICULTY_LABELS } from "../../engine/difficulty";
import { useSurfStore } from "../store";
import { BestTable } from "./BestTable";
import { Confetti } from "./Confetti";
import { useSession } from "./session-context";

/** The end of a run: the score, the best table, and the way back in. */
export function Results() {
  const session = useSession();
  const row = useSurfStore((s) => s.result);
  const best = useSurfStore((s) => s.best);
  const jump = useSurfStore((s) => s.jumpToReplay);
  if (!row) return null;
  return (
    <div className="ss-results">
      <Confetti />
      <div className="ss-results__card">
        <h2 className="ss-results__title">Great run!</h2>
        <div className="ss-result">
          <span className="ss-result__name">{row.name}</span>
          <span className="ss-result__score">{row.score.toLocaleString()}</span>
          <span className="ss-result__meta">
            {row.coins} coins, {row.distance.toLocaleString()} m, {DIFFICULTY_LABELS[row.difficulty]}
          </span>
          {row.best === 1 && <span className="ss-result__badge">New record!</span>}
          {row.best !== null && row.best > 1 && <span className="ss-result__badge">Best run #{row.best}</span>}
        </div>
        <div className="ss-results__actions">
          <button type="button" className="ss-button ss-button--go" onClick={() => session.playAgain()}>
            Play again
          </button>
          {session.kit && (
            <button type="button" className="ss-button ss-button--quiet" onClick={() => session.recalibrate()}>
              Calibrate again
            </button>
          )}
          <button type="button" className="ss-button ss-button--quiet" onClick={() => session.toLobby()}>
            Menu
          </button>
        </div>
        {jump && session.kit && <p className="ss-results__jump">Or jump to play again</p>}
      </div>
      {best.length > 0 && <BestTable entries={best} fresh={row.best ? [row.best] : []} />}
    </div>
  );
}
