"use client";
import { playerColor } from "@/games/kit/players";
import type { PhoneState } from "../../protocol";

const PLACE = ["1st", "2nd", "3rd", "4th"];

/** The phone at the end of a round: how this player did, and everyone's scores. */
export function RoundOver({ game, seat }: { game: PhoneState; seat: number }) {
  const won = game.winners.includes(seat);
  const tie = won && game.winners.length > 1;
  const place = game.rank ?? game.standings.length;
  const headline = won ? (tie ? "A shared win" : "You win") : game.winners.length === 0 ? "Nobody scored" : `${PLACE[place - 1] ?? ""} place`;

  return (
    <div className="fn-over" style={{ ["--pop" as string]: playerColor(seat) }}>
      <p className="fn-over__kicker">Round over</p>
      <h2 className={`fn-over__headline ${won ? "fn-over__headline--won" : ""}`}>{headline}</h2>
      <p className="fn-over__score">{game.score} points</p>
      <ol className="fn-over__list">
        {game.standings.map((row) => (
          <li key={row.seat} className={`fn-over__row ${row.seat === seat ? "fn-over__row--me" : ""}`} style={{ ["--pop" as string]: playerColor(row.seat) }}>
            <span>{row.name}</span>
            <strong>{row.score}</strong>
          </li>
        ))}
      </ol>
      <p className="fn-wait">The host can start another round from the big screen.</p>
    </div>
  );
}
