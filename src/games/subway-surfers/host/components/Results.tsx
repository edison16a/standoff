"use client";
import { playerColor } from "@/games/kit/players";
import { useSurfStore } from "../store";
import { BestTable } from "./BestTable";
import { Confetti } from "./Confetti";
import { useSession } from "./session-context";

/** The end of a round: the winner, every run, the best table, and the way back in. */
export function Results() {
  const session = useSession();
  const rows = useSurfStore((s) => s.results);
  const winner = useSurfStore((s) => s.winner);
  const best = useSurfStore((s) => s.best);
  const jump = useSurfStore((s) => s.jumpToReplay);
  const fresh = rows.flatMap((r) => (r.best ? [r.best] : []));
  const top = winner ? rows[winner - 1] : rows.length === 1 ? rows[0] : null;
  const title = rows.length === 1 ? "Great run!" : winner ? `${top!.name} wins!` : "A tie!";
  return (
    <div className="ss-results">
      <Confetti />
      <div className="ss-results__card">
        <h2 className="ss-results__title" style={top && rows.length > 1 ? { color: playerColor(top.slot) } : undefined}>
          {title}
        </h2>
        <div className="ss-results__rows">
          {rows.map((row) => (
            <div key={row.slot} className={`ss-result${winner === row.slot ? " ss-result--win" : ""}`} style={{ ["--pc" as string]: playerColor(row.slot) }}>
              <span className="ss-result__name">{row.name}</span>
              <span className="ss-result__score">{row.score.toLocaleString()}</span>
              <span className="ss-result__meta">
                {row.coins} coins, {row.distance.toLocaleString()} m
              </span>
              {row.best === 1 && <span className="ss-result__badge">New record!</span>}
              {row.best !== null && row.best > 1 && <span className="ss-result__badge">Best run #{row.best}</span>}
            </div>
          ))}
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
            Players
          </button>
        </div>
        {jump && session.kit && <p className="ss-results__jump">Or jump to play again</p>}
      </div>
      {best.length > 0 && <BestTable entries={best} fresh={fresh} />}
    </div>
  );
}
