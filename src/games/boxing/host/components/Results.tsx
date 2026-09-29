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

/** Each boxer's numbers. Minor rows drop out on a short screen, so the panel never covers the champion. */
const ROWS: readonly (readonly [key: string, label: string, minor: boolean])[] = [
  ["landed", "Landed", false],
  ["thrown", "Thrown", true],
  ["blocked", "Blocks", true],
  ["dodged", "Dodges", true],
  ["counters", "Counters", true],
  ["knockdowns", "Knockdowns", false],
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
        {/* One row per number and a column per boxer: narrow, so the panel stays clear of the champion. */}
        <table className="bx-results__table">
          <thead>
            <tr>
              <th />
              {([0, 1] as const).map((id) => (
                <th key={id} scope="col" className={winner === id ? "bx-results__won" : undefined} style={{ ["--who" as string]: colour(id) }}>
                  {result.names[id]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bx-results__card">
              <th scope="row">Scorecard</th>
              <td>{result.totals[0]}</td>
              <td>{result.totals[1]}</td>
            </tr>
            {ROWS.map(([key, label, minor]) => (
              <tr key={key} className={minor ? "bx-results__minor" : undefined}>
                <th scope="row">{label}</th>
                <td>{result.stats[0][key]}</td>
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
