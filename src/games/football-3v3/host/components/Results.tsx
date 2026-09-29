"use client";
import { playerColor } from "@/games/kit/players";
import { ROLE_SHORT } from "../../roles";
import { BUILDS } from "../../builds";
import { TEAMS } from "../../teams";
import { useFootballStore } from "../host-store";
import { playerOfTheGame } from "../results";
import { useSession } from "./session-context";

const COLUMNS = ["Pass yds", "Rush yds", "Rec yds", "TD", "Tackles", "INT"] as const;

/**
 * The final whistle, after the trophy presentation when there is a
 * winner: the winners and the score, the player of the game,
 * and every player's passing, rushing and receiving yards, touchdowns,
 * tackles and interceptions. Then the ways back in: the same teams
 * again, or back to the lobby to change them.
 */
export function Results() {
  const session = useSession();
  const over = useFootballStore((s) => s.over);
  const score = useFootballStore((s) => s.score);
  const rows = useFootballStore((s) => s.results);
  // A player who left can leave nobody ready: then only Change teams works.
  const blocked = useFootballStore((s) => s.startBlock !== null);
  // After the trophy presentation the card sits to one side of the winners.
  const aside = useFootballStore((s) => s.ceremony !== null);
  if (!over || rows.length === 0) return null;
  const winner = over.winner;
  const best = playerOfTheGame(rows);
  const colour = winner === null ? "#f5c518" : TEAMS[winner].color;
  return (
    <div className={`fb-results ${aside ? "fb-results--aside" : ""}`} role="dialog" aria-label="Final" style={{ "--team": colour } as React.CSSProperties}>
      <section className="fb-results__card">
        <p className="fb-results__kicker">Final</p>
        <h2 className="fb-results__title">{winner === null ? "It is a tie" : `${TEAMS[winner].name} win`}</h2>
        <p className="fb-results__score">
          <span style={{ color: TEAMS[0].color }}>{TEAMS[0].code}</span> {score[0]} <span className="fb-results__to">to</span> {score[1]}{" "}
          <span style={{ color: TEAMS[1].color }}>{TEAMS[1].code}</span>
        </p>
        {best && (
          <p className="fb-results__star">
            Player of the game: <strong>{best.name}</strong>
          </p>
        )}
        <table className="fb-results__table">
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col">Build</th>
              {COLUMNS.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ "--row": r.seat !== null ? playerColor(r.seat) : TEAMS[r.team].color } as React.CSSProperties}>
                <td className="fb-results__name">
                  <span className="fb-results__side" style={{ background: TEAMS[r.team].color }} />
                  {r.name}
                </td>
                <td>
                  {BUILDS[r.build].short}, {ROLE_SHORT[r.role]}
                </td>
                <td>{r.passYards}</td>
                <td>{r.rushYards}</td>
                <td>{r.recYards}</td>
                <td className="fb-results__td">{r.touchdowns}</td>
                <td>{r.tackles}</td>
                <td>{r.interceptions}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="fb-results__actions">
          <button type="button" className="fb-start" disabled={blocked} onClick={() => session.startGame()}>
            Play again
          </button>
          <button type="button" className="fb-ghost" onClick={() => session.backToLobby()}>
            Change teams
          </button>
        </div>
      </section>
    </div>
  );
}
