"use client";
import { DIFFICULTY, multiplierText } from "../../engine/difficulty";
import { useSurfStore, type ResultRow } from "../store";
import { Board } from "./Board";
import { Confetti } from "./Confetti";
import { useSession } from "./session-context";

/** The end of a run: the score and where it came from, its place on this computer, and the way back in. */
export function Results() {
  const session = useSession();
  const row = useSurfStore((s) => s.result);
  const jump = useSurfStore((s) => s.jumpToReplay);
  if (!row) return null;
  const level = DIFFICULTY[row.difficulty];
  return (
    <div className="ss-results">
      <Confetti />
      <div className="ss-results__card">
        <h2 className="ss-results__title">Great run!</h2>
        <div className="ss-result">
          <span className="ss-result__name">{row.name}</span>
          <span className="ss-result__score">{row.score.toLocaleString()}</span>
          <span className="ss-result__rank">#{row.rank.toLocaleString()} on this computer</span>
          {row.best && <span className="ss-result__badge">New best!</span>}
          <span className="ss-result__meta">
            {row.coins} coins, {row.distance.toLocaleString()} m, {level.label} {multiplierText(level.multiplier)}
            {row.input === "keyboard" ? ", keyboard" : ""}
          </span>
        </div>
        <Breakdown points={row.points} />
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
        {jump && <p className="ss-results__jump">{session.kit ? "Or jump to play again" : "Or press Up to play again"}</p>}
      </div>
      <Board highlight={row.entryId} />
    </div>
  );
}

/** Running, coins and power ups: coins and power ups count on top of the distance. */
function Breakdown({ points }: { points: ResultRow["points"] }) {
  const parts = [
    ["Running", points.running],
    ["Coins", points.coins],
    ["Power ups", points.powers],
  ] as const;
  return (
    <dl className="ss-points">
      {parts.map(([label, value]) => (
        <div key={label} className="ss-points__part">
          <dt>{label}</dt>
          <dd>{value.toLocaleString()}</dd>
        </div>
      ))}
    </dl>
  );
}
