"use client";
import { useControllerStore } from "../controller-store";
import { LobbySteps } from "./LobbySteps";
import { MatchPad } from "./MatchPad";

/** Fencing on the phone: pick and calibrate in the lobby, then fence. */
export function PhoneScreen() {
  const { slot, game } = useControllerStore();
  if (!slot) return null;
  if (game && game.phase !== "lobby") return <MatchPad slot={slot} game={game} />;
  return (
    <div className="fencing-setup">
      <LobbySteps slot={slot} />
    </div>
  );
}
