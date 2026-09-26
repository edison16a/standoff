"use client";
import { useControllerStore } from "../controller-store";
import { LobbySteps } from "./LobbySteps";
import { MatchPad } from "./MatchPad";

/** Blade Clash on the phone: calibrate and pick in the lobby, then fight. */
export function PhoneScreen() {
  const { slot, game } = useControllerStore();
  if (!slot) return null;
  if (game && game.phase !== "lobby") return <MatchPad slot={slot} game={game} />;
  return (
    <div className="blade-setup">
      <LobbySteps slot={slot} />
    </div>
  );
}
