"use client";
import { Icon } from "@/components/ui/Icon";
import type { Slot } from "@/games/blade-clash/players";
import type { ControllerState } from "@/games/blade-clash/protocol";
import { playerColor } from "@/games/kit/players";
import { useControllerStore } from "../controller-store";
import { DragPad } from "./DragPad";
import { HitFlash } from "./HitFlash";
import { MoveButtons } from "./MoveButtons";
import { SwordGauge } from "./SwordGauge";
import { useController } from "./session-context";

/** One word for the current phase, from this player's point of view. */
function headline(game: ControllerState, slot: Slot): string {
  switch (game.phase) {
    case "countdown":
      return game.countdown ? String(game.countdown) : "Fight";
    case "live":
      return "Fight";
    case "point":
      return game.scorer === slot ? "Point to you" : "Point to them";
    case "finish":
      return game.winner === slot ? "Finished them" : "Down";
    case "paused":
      return "Paused";
    case "matchOver":
      return game.winner === slot ? "You win" : "You lose";
    default:
      return "";
  }
}

/** Points as a row of pips toward the win, scored ones in the player's colour. */
function Points({ scored, max, colour, label }: { scored: number; max: number; colour: string; label: string }) {
  return (
    <span className="health" aria-label={`${label}: ${scored} of ${max}`} style={{ ["--pip" as string]: colour }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`health__pip ${i < scored ? "health__pip--full" : ""}`} />
      ))}
    </span>
  );
}

/**
 * The phone during a fight. Eyes are on the computer, so this is a live
 * picture of the sword (a drag pad on phones without sensors) and two
 * big buttons for footwork, with both scores along the top. After
 * the fight it offers a rematch or the menu.
 */
export function MatchPad({ slot, game }: { slot: Slot; game: ControllerState }) {
  const session = useController();
  const inputMode = useControllerStore((state) => state.inputMode);
  const me = slot - 1;
  const them = slot === 1 ? 1 : 0;
  const colour = playerColor(slot);

  return (
    <div className={`pad pad--${inputMode}`}>
      <header className="pad__top">
        <Points scored={game.score[me] ?? 0} max={game.pointsToWin} colour={colour} label="Your points" />
        <strong className="pad__title">{headline(game, slot)}</strong>
        <Points scored={game.score[them] ?? 0} max={game.pointsToWin} colour={playerColor(them + 1)} label="Their points" />
      </header>

      {game.phase === "matchOver" ? (
        <div className="pad__after">
          <button type="button" className="hold hold--solo" disabled={game.rematchVotes[me]} onClick={() => session.press({ kind: "rematch" })}>
            <Icon name="refresh" size={28} />
            {game.rematchVotes[me] ? "Waiting" : "Rematch"}
          </button>
          <button type="button" className="btn btn--ghost btn--lg btn--block" onClick={() => session.press({ kind: "menu" })}>
            Menu
          </button>
        </div>
      ) : (
        <>
          <div className="pad__sword">
            {inputMode === "touch" ? <DragPad colour={colour} /> : <SwordGauge colour={colour} className="pad__gauge" />}
            <HitFlash />
          </div>
          <MoveButtons />
        </>
      )}
    </div>
  );
}
