"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { playerColor } from "@/games/kit/players";
import { CHARACTERS, TEAMS } from "../../roster";
import { JerseyBadge } from "../../ui/JerseyBadge";
import { useNbaStore, type ResultRow } from "../host-store";
import { useSession } from "./session-context";

/** The standout player: points first, then everything else they did. */
function mvpOf(rows: readonly ResultRow[], winner: 0 | 1): ResultRow | null {
  const score = (r: ResultRow) => r.points * 2 + r.rebounds + r.assists * 1.5 + r.steals * 2 + r.blocks * 2 + (r.team === winner ? 4 : 0);
  return [...rows].sort((a, b) => score(b) - score(a))[0] ?? null;
}

function BoxScore({ rows, team }: { rows: ResultRow[]; team: 0 | 1 }) {
  return (
    <table className="nba-box" style={{ "--team": TEAMS[team].color } as React.CSSProperties}>
      <caption>{TEAMS[team].name}</caption>
      <thead>
        <tr>
          <th scope="col">Player</th>
          <th scope="col" title="Points">PTS</th>
          <th scope="col" title="Rebounds">REB</th>
          <th scope="col" title="Assists">AST</th>
          <th scope="col" title="Steals">STL</th>
          <th scope="col" title="Blocks">BLK</th>
          <th scope="col" title="Shots made of shots taken">FG</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <th scope="row">
              <span className="nba-box__dot" style={{ background: r.seat !== null ? playerColor(r.seat) : "#94a3b8" }} />
              {r.name}
              {r.seat !== null && <small>{CHARACTERS[r.character].short}</small>}
            </th>
            <td className="nba-box__pts">{r.points}</td>
            <td>{r.rebounds}</td>
            <td>{r.assists}</td>
            <td>{r.steals}</td>
            <td>{r.blocks}</td>
            <td>
              {r.made}/{r.attempts}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The final whistle: the winners, the game's MVP and both box scores,
 * after a moment for the confetti. Play again keeps the teams; Change
 * teams goes back to the lobby.
 */
export function Results() {
  const session = useSession();
  const results = useNbaStore((s) => s.results);
  const winner = useNbaStore((s) => s.winner);
  const score = useNbaStore((s) => s.score);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 2600);
    return () => clearTimeout(timer);
  }, []);
  if (!shown || winner === null) return null;
  const mvp = mvpOf(results, winner);
  const loser = winner === 0 ? 1 : 0;
  return (
    <div className="nba-results" style={{ "--team": TEAMS[winner].color, "--team-dark": TEAMS[winner].dark } as React.CSSProperties}>
      <div className="nba-results__card">
        <header className="nba-results__head">
          <span className="nba-results__eyebrow">Final</span>
          <h2>{TEAMS[winner].name} win</h2>
          <p className="nba-results__score">
            {score[winner]} <span>to</span> {score[loser]}
          </p>
        </header>
        {mvp && (
          <div className="nba-results__mvp">
            <JerseyBadge character={mvp.character} team={mvp.team} size={72} />
            <div>
              <span className="nba-results__eyebrow">MVP</span>
              <strong>{mvp.name}</strong>
              <span>
                {mvp.points} points, {mvp.rebounds} rebounds, {mvp.assists} assists
              </span>
            </div>
          </div>
        )}
        <div className="nba-results__boxes">
          <BoxScore rows={results.filter((r) => r.team === winner)} team={winner} />
          <BoxScore rows={results.filter((r) => r.team === loser)} team={loser} />
        </div>
        <div className="nba-results__actions">
          <button type="button" className="btn btn--lg" onClick={() => session.backToLobby()}>
            <Icon name="users" />
            Change teams
          </button>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => session.start()}>
            <Icon name="refresh" />
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
