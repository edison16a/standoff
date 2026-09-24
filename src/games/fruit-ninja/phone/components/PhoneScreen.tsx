"use client";
import { useFruitPhone } from "../phone-store";
import { PlayPad } from "./PlayPad";
import { RoundOver } from "./RoundOver";
import { SetupSteps } from "./SetupSteps";

/** Fruit Ninja on the phone: setup until ready, then the play pad during a round, then the result. */
export function PhoneScreen() {
  const { ready, game, seat } = useFruitPhone();
  const inRound = ready && game?.inRound;
  if (inRound && game && (game.phase === "countdown" || game.phase === "playing" || game.phase === "ending")) return <PlayPad />;
  if (inRound && game && game.phase === "over") return <RoundOver game={game} seat={seat} />;
  return <SetupSteps />;
}
