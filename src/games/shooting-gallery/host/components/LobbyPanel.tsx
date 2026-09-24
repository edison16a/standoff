"use client";
import { playerColor } from "@/games/kit/players";
import { ROUND_CHOICES } from "../../engine/rules";
import type { PlayerView } from "../../protocol";
import { BestTable } from "./BestTable";
import { useGallery, useHud } from "./session-context";

/** Where a player is in their phone's setup, in a few words. */
function status(player: PlayerView): string {
  if (player.ready) return "Ready";
  switch (player.step) {
    case "calibrate":
      return "Calibrating";
    case "gun":
      return "Picking a gun";
    case "ready":
      return "Almost ready";
    default:
      return "Joining";
  }
}

/**
 * The lobby card on the right of the booth: who is here and how far
 * through setup they are, the round length, the Start button, and the
 * best scores for that length.
 */
export function LobbyPanel() {
  const session = useGallery();
  const game = useHud((state) => state.game);
  const seconds = useHud((state) => state.seconds);
  const best = useHud((state) => state.best);
  const canStart = useHud((state) => state.canStart);
  const hint = useHud((state) => state.hint);
  if (game.phase !== "lobby") return null;

  return (
    <aside className="sg-panel sg-lobby" aria-label="Lobby">
      <header className="sg-panel__head">
        <h2 className="sg-panel__title">Step right up</h2>
        <p className="sg-panel__lead">Point your phone at the screen to aim, and tap Shoot. Top score wins.</p>
      </header>

      <ul className="sg-lobby__players" aria-label="Players">
        {game.players.length === 0 && <li className="sg-lobby__empty">Up to 4 players. Scan the code to join.</li>}
        {game.players.map((player) => (
          <li key={player.seat} className="sg-lobby__player" style={{ "--p": playerColor(player.seat) } as React.CSSProperties}>
            <span className="sg-lobby__dot" />
            <span className="sg-lobby__name">{player.name}</span>
            <span className={`sg-lobby__status ${player.ready ? "sg-lobby__status--ready" : ""}`}>{status(player)}</span>
          </li>
        ))}
      </ul>

      <div className="sg-lobby__length" role="group" aria-label="Round length">
        <span className="sg-lobby__label">Round</span>
        {ROUND_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            className={`sg-seg ${choice === seconds ? "sg-seg--on" : ""}`}
            aria-pressed={choice === seconds}
            onClick={() => session.setSeconds(choice)}
          >
            {choice}s
          </button>
        ))}
      </div>

      <button type="button" className="sg-start" disabled={!canStart} onClick={() => session.start()}>
        Start
      </button>
      <p className="sg-lobby__hint">{hint}</p>

      <dl className="sg-points" aria-label="Points">
        <div>
          <dt>Duck</dt>
          <dd>10</dd>
        </div>
        <div>
          <dt>Bullseye</dt>
          <dd>15, bull 40</dd>
        </div>
        <div>
          <dt>Duckling</dt>
          <dd>25</dd>
        </div>
        <div>
          <dt>Plate</dt>
          <dd>30</dd>
        </div>
        <div>
          <dt>Golden duck</dt>
          <dd>50</dd>
        </div>
      </dl>

      <BestTable entries={best} seconds={seconds} />
    </aside>
  );
}
