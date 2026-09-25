"use client";
import { useBoxingStore } from "../host-store";
import { formatSeconds } from "./PlayersMenu";
import { useSession } from "./session-context";

const METHOD: Record<string, string> = {
  KO: "by knockout",
  TKO: "by stoppage",
  Decision: "on points",
  Draw: "",
};

const ROWS: readonly [string, string][] = [
  ["landed", "Punches landed"],
  ["thrown", "Punches thrown"],
  ["blocked", "Blocks"],
  ["dodged", "Dodges"],
  ["counters", "Counters"],
  ["knockdowns", "Knockdowns"],
];

/** The end of the fight: the winner, the scorecards, the numbers, and what next. */
export function Results() {
  const session = useSession();
  const result = useBoxingStore((state) => state.result);
  const players = useBoxingStore((state) => state.players);
  const records = useBoxingStore((state) => state.records);
  const newBest = useBoxingStore((state) => state.newBest);
  if (!result) return null;
  const winner = result.winner;
  const title = winner === null ? "A draw" : `${result.names[winner]} wins`;
  const who = winner === null ? "" : players === 1 ? (winner === 0 ? "You win" : "The computer wins") : `Player ${winner + 1} wins`;
  return (
    <section className="bx-results" aria-live="polite">
      <p className="bx-eyebrow">{who || "Nobody wins"}</p>
      <h2 className="bx-results__title">{title}</h2>
      <p className="bx-results__how">
        {METHOD[result.method]}
        {result.method === "KO" || result.method === "TKO" ? ` in round ${result.round} at ${formatSeconds(result.second)}` : ""}
      </p>
      {newBest && <p className="bx-results__best">{newBest}!</p>}
      <table className="bx-results__table">
        <thead>
          <tr>
            <th>{result.names[0]}</th>
            <th />
            <th>{result.names[1]}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bx-results__cards">
            <td>{result.totals[0]}</td>
            <td>Scorecard</td>
            <td>{result.totals[1]}</td>
          </tr>
          {ROWS.map(([key, label]) => (
            <tr key={key}>
              <td>{result.stats[0][key]}</td>
              <td>{label}</td>
              <td>{result.stats[1][key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {players === 1 && (
        <p className="bx-results__records">
          Your record against the computer: {records.wins} won, {records.losses} lost
        </p>
      )}
      <div className="bx-results__actions">
        <button type="button" className="bx-button bx-button--big" onClick={() => session.rematch()}>
          Play again
        </button>
        <button type="button" className="bx-button bx-button--ghost" onClick={() => session.newBoxers()}>
          Choose boxers
        </button>
        <button type="button" className="bx-button bx-button--ghost" onClick={() => session.menu()}>
          Menu
        </button>
      </div>
    </section>
  );
}
