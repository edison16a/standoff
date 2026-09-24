"use client";
import { Icon } from "@/components/ui/Icon";
import type { Slot } from "@/shared/players";
import type { ControllerState } from "@/shared/protocol";
import { useControllerStore } from "../controller-store";
import { MoveMeter, SwordGauge } from "./Gauges";
import { useController } from "./session-context";
import { TouchControls } from "./TouchControls";

/** One word for the current phase, from this player's point of view. */
function headline(game: ControllerState, slot: Slot): string {
  switch (game.phase) {
    case "enGarde":
      return game.countdown ? String(game.countdown) : "Allez";
    case "live":
      return "Allez";
    case "halt":
      return game.call ?? "Halt";
    case "replay":
      return "Replay";
    case "paused":
      return "Paused";
    case "matchOver":
      return game.winner === slot ? "You win" : "You lose";
    default:
      return "";
  }
}

/** What the phone shows during a match: the call, the score, and live readouts. */
export function MatchPad({ slot, game }: { slot: Slot; game: ControllerState }) {
  const session = useController();
  const inputMode = useControllerStore((state) => state.inputMode);
  const title = headline(game, slot);
  const me = slot - 1;
  const them = slot === 1 ? 1 : 0;

  return (
    <div className="pad">
      <section className="phone-card pad__status">
        <div className="pad__score">
          <span>
            <span className="label">You</span>
            <strong>{game.scores[me]}</strong>
          </span>
          <span>
            <span className="label">Them</span>
            <strong>{game.scores[them]}</strong>
          </span>
        </div>
        <h1 className="pad__title">{title}</h1>
      </section>

      {game.phase === "replay" && (
        <button type="button" className="btn btn--lg btn--block btn--primary" disabled={game.skipVotes[me]} onClick={() => session.skip()}>
          <Icon name="skip" />
          {game.skipVotes[me] ? "Waiting" : "Skip"}
        </button>
      )}

      {game.phase === "matchOver" && (
        <button type="button" className="btn btn--lg btn--block btn--primary" disabled={game.rematchVotes[me]} onClick={() => session.rematch()}>
          <Icon name="refresh" />
          {game.rematchVotes[me] ? "Waiting" : "Rematch"}
        </button>
      )}

      {inputMode === "touch" ? (
        <TouchControls />
      ) : (
        <section className="phone-card pad__live">
          <SwordGauge />
          <MoveMeter />
          {game.phase === "enGarde" && (
            <button type="button" className="btn btn--block" onClick={() => session.calibrate()}>
              <Icon name="target" />
              Recalibrate
            </button>
          )}
        </section>
      )}
    </div>
  );
}
