"use client";
import { playerColor } from "@/games/kit/players";
import { useHud } from "./session-context";

/**
 * The live leaderboard across the top during a round: the clock in the
 * middle of a fairground sign, and each player's name and score in their
 * colour, best first.
 */
export function Scoreboard() {
  const game = useHud((state) => state.game);
  if (game.phase === "lobby") return null;
  const players = game.players.filter((p) => p.inRound);
  const low = game.phase === "playing" && game.timeLeft <= 5;
  return (
    <div className="sg-board" aria-label="Scores">
      <div className={`sg-board__clock ${low ? "sg-board__clock--low" : ""}`}>
        <span className="sg-board__label">Time</span>
        <span className="sg-board__time">{game.phase === "results" ? "0" : game.timeLeft}</span>
      </div>
      <ol className="sg-board__list">
        {players.map((player) => (
          <li key={player.seat} className={`sg-board__row ${player.connected ? "" : "sg-board__row--gone"}`} style={{ "--p": playerColor(player.seat) } as React.CSSProperties}>
            <span className="sg-board__place">{player.score > 0 ? player.place : "-"}</span>
            <span className="sg-board__name">{player.name}</span>
            <span className="sg-board__score">{player.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
