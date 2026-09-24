"use client";
import { playerColor } from "@/games/kit/players";
import { useFruitStore } from "../host-store";
import { useSession } from "./session-context";

const PLACES = ["1st", "2nd", "3rd", "4th"];

/** The end of a round: who won, everyone's final score, and what next. */
export function Results() {
  const session = useSession();
  const hud = useFruitStore((state) => state.hud);
  const seats = useFruitStore((state) => state.seats);
  const canReplay = seats.some((seat) => seat.connected && seat.ready);
  const winners = hud.standings.filter((row) => hud.winners.includes(row.seat));

  let headline = "Nobody scored";
  if (winners.length === 1) headline = `${winners[0]!.name} wins`;
  else if (winners.length > 1) headline = "It is a tie";

  return (
    <section className="fn-panel fn-results" aria-label="Results">
      <p className="fn-results__kicker">Final scores</p>
      <h2 className="fn-results__winner" style={{ ["--pop" as string]: winners.length === 1 ? playerColor(winners[0]!.seat) : "#ffd23a" }}>
        {headline}
      </h2>
      <ol className="fn-results__list">
        {hud.standings.map((row) => {
          const place = 1 + hud.standings.filter((other) => other.score > row.score).length;
          return (
            <li key={row.seat} className={`fn-results__row ${place === 1 && row.score > 0 ? "fn-results__row--top" : ""}`} style={{ ["--pop" as string]: playerColor(row.seat) }}>
              <span className="fn-results__place">{PLACES[place - 1]}</span>
              <span className="fn-results__name">{row.name}</span>
              <span className="fn-results__score">{row.score}</span>
            </li>
          );
        })}
      </ol>
      <div className="fn-results__actions">
        <button type="button" className="fn-start" disabled={!canReplay} onClick={() => session.start()}>
          Play again
        </button>
        <button type="button" className="fn-ghost" onClick={() => session.toLobby()}>
          Change settings
        </button>
      </div>
    </section>
  );
}
