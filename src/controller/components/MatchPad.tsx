"use client";
import { Icon } from "@/components/ui/Icon";
import type { Slot } from "@/shared/players";
import type { ControllerState } from "@/shared/protocol";
import { useControllerStore } from "../controller-store";
import { MoveButtons, StrikeButtons } from "./MoveButtons";
import { useController } from "./session-context";

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

/**
 * The phone during a match. Eyes are on the computer, so this is mostly
 * two huge buttons for footwork, with the score and call along the top.
 */
export function MatchPad({ slot, game }: { slot: Slot; game: ControllerState }) {
  const session = useController();
  const inputMode = useControllerStore((state) => state.inputMode);
  const me = slot - 1;
  const them = slot === 1 ? 1 : 0;

  return (
    <div className="pad">
      <header className="pad__top">
        <span className="pad__score mono">
          {game.scores[me]} : {game.scores[them]}
        </span>
        <strong className="pad__title">{headline(game, slot)}</strong>
      </header>

      {game.phase === "replay" ? (
        <button type="button" className="hold hold--solo" disabled={game.skipVotes[me]} onClick={() => session.skip()}>
          <Icon name="skip" size={28} />
          {game.skipVotes[me] ? "Waiting" : "Skip"}
        </button>
      ) : game.phase === "matchOver" ? (
        <button type="button" className="hold hold--solo" disabled={game.rematchVotes[me]} onClick={() => session.rematch()}>
          <Icon name="refresh" size={28} />
          {game.rematchVotes[me] ? "Waiting" : "Rematch"}
        </button>
      ) : (
        <>
          <MoveButtons />
          {inputMode === "touch" && <StrikeButtons />}
        </>
      )}
    </div>
  );
}
