"use client";
import { playerColor } from "@/games/kit/players";
import type { GalleryState } from "../../protocol";
import { BestTable } from "./BestTable";
import { useGallery, useHud } from "./session-context";

function headline(game: GalleryState): string {
  const names = game.winners.map((seat) => game.players.find((p) => p.seat === seat)?.name ?? `Player ${seat}`);
  if (names.length === 0) return "No hits this time";
  if (names.length === 1) return game.players.filter((p) => p.inRound).length === 1 ? `${names[0]} scores` : `${names[0]} wins`;
  return `A tie: ${names.join(" and ")}`;
}

function ordinal(n: number): string {
  return ["1st", "2nd", "3rd"][n - 1] ?? `${n}th`;
}

/**
 * The end of a round: who won, everyone's score and accuracy, where the
 * scores landed in the best table, and the way back in.
 */
export function Results() {
  const session = useGallery();
  const game = useHud((state) => state.game);
  const best = useHud((state) => state.best);
  if (game.phase !== "results") return null;
  const players = game.players.filter((p) => p.inRound);
  const top = players[0];
  const fresh = players.flatMap((p) => (p.best ? [p.best] : []));

  return (
    <div className="sg-results" role="dialog" aria-label="Round over">
      <section className="sg-panel sg-results__card">
        <p className="sg-results__kicker">Round over</p>
        <h2 className="sg-results__title" style={{ color: top && game.winners.length === 1 ? playerColor(top.seat) : undefined }}>
          {headline(game)}
        </h2>
        <table className="sg-results__table">
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Player</th>
              <th scope="col">Score</th>
              <th scope="col">Hits</th>
              <th scope="col">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.seat} style={{ "--p": playerColor(player.seat) } as React.CSSProperties}>
                <td className="sg-results__place">{ordinal(player.place)}</td>
                <td className="sg-results__name">
                  {player.name}
                  {player.best && <span className="sg-results__badge">{ordinal(player.best)} best</span>}
                  {!player.connected && <span className="sg-results__gone">left</span>}
                </td>
                <td className="sg-results__score">{player.score}</td>
                <td>
                  {player.hits} of {player.shots}
                </td>
                <td>{player.shots ? `${Math.round((player.hits / player.shots) * 100)}%` : "No shots"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="sg-results__actions">
          <button type="button" className="sg-start" onClick={() => session.toLobby()}>
            Play again
          </button>
          <p className="sg-lobby__hint">Or tap Play again on every phone.</p>
        </div>
      </section>
      <section className="sg-panel sg-results__best">
        <BestTable entries={best} seconds={game.seconds} fresh={fresh} />
      </section>
    </div>
  );
}
