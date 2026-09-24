"use client";
import { playerColor } from "@/games/kit/players";
import { ROSTER } from "../../roster";
import { TEAMS } from "../../teams";
import { useFifaStore } from "../host-store";
import { useSession } from "./session-context";

/**
 * The final whistle: the winners and the score, the man of the match,
 * everyone's goals, shots, passes and tackles, the keepers' saves, and the ways
 * back in: the same teams again, or back to pick new ones.
 */
export function Results() {
  const session = useSession();
  const winner = useFifaStore((s) => s.winner);
  const score = useFifaStore((s) => s.score);
  const rows = useFifaStore((s) => s.results);
  const saves = useFifaStore((s) => s.saves);
  if (winner === null || rows.length === 0) return null;
  const team = TEAMS[winner];
  const best = rows[0]!;
  return (
    <div className="fifa-results" role="dialog" aria-label="Full time" style={{ "--team": team.color } as React.CSSProperties}>
      <section className="fifa-results__card">
        <p className="fifa-results__kicker">Full time</p>
        <h2 className="fifa-results__title">{team.name} win</h2>
        <p className="fifa-results__score">
          <span style={{ color: TEAMS[0].color }}>{TEAMS[0].code}</span> {score[0]} <span className="fifa-results__dash">to</span> {score[1]}{" "}
          <span style={{ color: TEAMS[1].color }}>{TEAMS[1].code}</span>
        </p>
        {best.goals > 0 && (
          <p className="fifa-results__star">
            Player of the match: <strong>{best.name}</strong> with {best.goals} {best.goals === 1 ? "goal" : "goals"}
          </p>
        )}
        <table className="fifa-results__table">
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col">Star</th>
              <th scope="col">Goals</th>
              <th scope="col">Shots</th>
              <th scope="col">Passes</th>
              <th scope="col">Tackles</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ "--row": r.seat !== null ? playerColor(r.seat) : TEAMS[r.team].color } as React.CSSProperties}>
                <td className="fifa-results__name">
                  <span className="fifa-results__side" style={{ background: TEAMS[r.team].color }} />
                  {r.seat !== null ? r.name : "Computer"}
                </td>
                <td>{ROSTER[r.character].short}</td>
                <td className="fifa-results__goals">{r.goals}</td>
                <td>{r.shots}</td>
                <td>{r.passes}</td>
                <td>{r.tackles}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="fifa-results__keepers">
          Keeper saves: {TEAMS[0].name} {saves[0]}, {TEAMS[1].name} {saves[1]}
        </p>
        <div className="fifa-results__actions">
          <button type="button" className="fifa-start" onClick={() => session.startMatch()}>
            Play again
          </button>
          <button type="button" className="fifa-ghost" onClick={() => session.backToLobby()}>
            Change teams
          </button>
        </div>
      </section>
    </div>
  );
}
