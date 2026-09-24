"use client";
import { useSyncExternalStore } from "react";
import { AimPad } from "@/games/kit/aim/AimPad";
import { playerColor } from "@/games/kit/players";
import type { PhoneState } from "../../protocol";
import { useFruitPhone } from "../phone-store";
import { usePhone } from "./session-context";

const PLACE = ["1st", "2nd", "3rd", "4th"];

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function status(game: PhoneState): string {
  if (game.phase === "countdown") return "Get ready";
  if (game.phase === "ending") return "Time is up";
  if (game.stunned) return "Stunned by a bomb";
  return "Point and swing to slice";
}

/**
 * The phone during a round. There is nothing to press: slicing is always
 * on, so the phone only shows the score, the place and the clock, plus a
 * small button to recentre the aim if it drifts. Phones without motion
 * sensors get a drag pad instead.
 */
export function PlayPad() {
  const session = usePhone();
  const game = useFruitPhone((state) => state.game);
  const seat = useFruitPhone((state) => state.seat);
  const flash = useFruitPhone((state) => state.flash);
  const snapshot = useSyncExternalStore(session.aim.subscribe, session.aim.getSnapshot, session.aim.getSnapshot);
  if (!game) return null;
  const touch = snapshot.source === "touch";
  const colour = playerColor(seat);

  return (
    <div className={`fn-play ${game.stunned ? "fn-play--stunned" : ""}`} style={{ ["--pop" as string]: colour }}>
      <div className="fn-play__top">
        <span className="fn-play__clock">{clock(game.secondsLeft)}</span>
        {game.rank !== null && game.players > 1 && game.score > 0 && (
          <span className="fn-play__rank">
            {PLACE[game.rank - 1]} of {game.players}
          </span>
        )}
      </div>
      <div className="fn-play__score" key={game.score}>
        {game.score}
      </div>
      <p className="fn-play__status">{game.phase === "countdown" && game.countdown > 0 ? `Get ready ${game.countdown}` : status(game)}</p>
      {flash && <div key={flash.at} className={`fn-play__flash fn-play__flash--${flash.event}`} aria-hidden="true" />}
      {touch ? (
        <AimPad aim={session.aim} />
      ) : (
        <div className="fn-play__hand" aria-hidden="true">
          <span className="fn-play__ring" />
        </div>
      )}
      {!touch && (
        <button type="button" className="btn btn--ghost fn-play__recenter" onClick={() => session.recenter()}>
          Recenter aim
        </button>
      )}
    </div>
  );
}
