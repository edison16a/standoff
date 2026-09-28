"use client";
import { playerColor } from "@/games/kit/players";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import { buildFor } from "../../engine/builds";
import { useBoxingStore } from "../host-store";
import { formatSeconds } from "./PlayersMenu";
import { useSession } from "./session-context";

const METHOD: Record<string, string> = {
  KO: "by knockout",
  TKO: "by stoppage",
  Decision: "on points",
  Draw: "",
};

const COLUMNS: readonly [string, string][] = [
  ["landed", "Landed"],
  ["thrown", "Thrown"],
  ["blocked", "Blocks"],
  ["dodged", "Dodges"],
  ["counters", "Counters"],
  ["knockdowns", "Knockdowns"],
];

/**
 * The end of the fight, over the ceremony in the ring: the champion's
 * name big across the top, how they won, and along the bottom the
 * scorecards, both boxers' numbers and what next.
 */
export function Results() {
  const session = useSession();
  const result = useBoxingStore((state) => state.result);
  const players = useBoxingStore((state) => state.players);
  const picks = useBoxingStore((state) => state.picks);
  const records = useBoxingStore((state) => state.records);
  const newBest = useBoxingStore((state) => state.newBest);
  if (!result) return null;
  const winner = result.winner;
  const colour = (id: 0 | 1) => (id === 1 && players === 1 ? "#9aa3b5" : playerColor(id + 1));
  const how = `${METHOD[result.method]}${result.method === "KO" || result.method === "TKO" ? ` in round ${result.round} at ${formatSeconds(result.second)}` : ""}`;
  const names = winner === null ? ([0, 1] as const).map((id) => ({ name: result.names[id], colour: colour(id) })) : [{ name: result.names[winner], colour: colour(winner) }];
  const subtitle = winner === null ? "A draw on the scorecards" : `${buildFor(picks[winner]).name}. Wins ${how}.`;
  return (
    <VictoryOverlay eyebrow={winner === null ? "Draw" : "Champion"} names={names} subtitle={subtitle}>
      <div className="bx-results">
        {newBest && <p className="bx-results__best">{newBest}!</p>}
        <table className="bx-results__table">
          <thead>
            <tr>
              <th />
              <th>Scorecard</th>
              {COLUMNS.map(([key, label]) => (
                <th key={key}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {([0, 1] as const).map((id) => (
              <tr key={id} className={winner === id ? "bx-results__won" : undefined} style={{ ["--who" as string]: colour(id) }}>
                <th scope="row">{result.names[id]}</th>
                <td className="bx-results__card">{result.totals[id]}</td>
                {COLUMNS.map(([key]) => (
                  <td key={key}>{result.stats[id][key]}</td>
                ))}
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
            Choose builds
          </button>
          <button type="button" className="bx-button bx-button--ghost" onClick={() => session.menu()}>
            Menu
          </button>
        </div>
      </div>
    </VictoryOverlay>
  );
}
