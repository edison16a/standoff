"use client";
import { Icon } from "@/components/ui/Icon";
import type { Slot } from "@/shared/players";
import type { ControllerState } from "@/shared/protocol";
import { useControllerStore } from "../controller-store";
import { MoveMeter, SwordGauge } from "./Gauges";
import { useController } from "./session-context";
import { TouchControls } from "./TouchControls";

/** The short headline for the current phase, from this player's point of view. */
function headline(game: ControllerState, slot: Slot): { title: string; detail: string } {
  switch (game.phase) {
    case "enGarde":
      return { title: game.countdown ? String(game.countdown) : "Allez", detail: "En garde. Hold your guard." };
    case "live":
      return { title: "Allez", detail: "Push out to advance, thrust to jab, snap back to parry." };
    case "halt":
      return { title: game.call ?? "Halt", detail: "Point decided." };
    case "replay":
      return { title: "Replay", detail: "Watch the computer, or skip." };
    case "paused":
      return { title: "Paused", detail: "Waiting for a player to reconnect." };
    case "matchOver":
      return game.winner === slot
        ? { title: "You win", detail: `${game.scores[slot - 1]} to ${game.scores[slot === 1 ? 1 : 0]}.` }
        : { title: "You lose", detail: "Good bout. Go again?" };
    default:
      return { title: "", detail: "" };
  }
}

/** What the phone shows during a match: the call, the score, and live readouts. */
export function MatchPad({ slot, game }: { slot: Slot; game: ControllerState }) {
  const session = useController();
  const inputMode = useControllerStore((state) => state.inputMode);
  const { title, detail } = headline(game, slot);
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
          <span className="label">First to {game.touchesToWin}</span>
          <span>
            <span className="label">Them</span>
            <strong>{game.scores[them]}</strong>
          </span>
        </div>
        <h1 className="pad__title">{title}</h1>
        <p className="muted">{detail}</p>
      </section>

      {game.phase === "replay" && (
        <button type="button" className="btn btn--lg btn--block btn--primary" disabled={game.skipVotes[me]} onClick={() => session.skip()}>
          <Icon name="skip" />
          {game.skipVotes[me] ? "Waiting for the other player" : "Skip replay"}
        </button>
      )}

      {game.phase === "matchOver" && (
        <button type="button" className="btn btn--lg btn--block btn--primary" disabled={game.rematchVotes[me]} onClick={() => session.rematch()}>
          <Icon name="refresh" />
          {game.rematchVotes[me] ? "Waiting for a rematch vote" : "Rematch"}
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
