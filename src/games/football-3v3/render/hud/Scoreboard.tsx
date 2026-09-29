"use client";
import type { Board } from "./board";

/**
 * The broadcast score bug along the bottom of the big screen: both
 * teams and their scores, a dot for the side with the ball, the
 * quarter and clock, the down and distance with the spot, and the
 * target score. The play clock shows while a pick or a hike is due.
 */
export function Scoreboard({ board }: { board: Board }) {
  const [home, away] = board.teams;
  return (
    <div className="fb-board" role="status" aria-label="Scoreboard">
      {[home, away].map((t) => (
        <div key={t.team} className="fb-board__team" style={{ ["--team" as string]: t.color }}>
          <span className="fb-board__code">{t.code}</span>
          <span className="fb-board__score">{t.score}</span>
          <span className={t.ball ? "fb-board__ball fb-board__ball--on" : "fb-board__ball"} aria-label={t.ball ? "Has the ball" : undefined} />
        </div>
      ))}
      <div className="fb-board__time">
        <span className="fb-board__period">{board.period}</span>
        <span className="fb-board__clock">{board.clock}</span>
      </div>
      <div className="fb-board__down">
        <span className="fb-board__situation">{board.situation}</span>
        {board.spot && <span className="fb-board__spot">{board.spot}</span>}
      </div>
      {board.countdown !== null && <div className="fb-board__play">{board.countdown}</div>}
      <div className="fb-board__target">{board.target}</div>
    </div>
  );
}
