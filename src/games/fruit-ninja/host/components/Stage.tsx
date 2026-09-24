"use client";
import { AimOverlay } from "@/games/kit/aim/AimOverlay";
import { useFruitStore } from "../host-store";
import { Countdown } from "./Countdown";
import { Hud } from "./Hud";
import { Lobby } from "./Lobby";
import { Results } from "./Results";
import { useSession } from "./session-context";
import { StageCanvas } from "./StageCanvas";

/**
 * Fruit Ninja on one full screen. The board is always there: practice
 * fruit drifts up in the lobby, the countdown and the round play out on
 * it, and the results sit on top at the end. The platform adds the logo,
 * the tool bar and the join code around it.
 */
export function Stage() {
  const session = useSession();
  const phase = useFruitStore((state) => state.hud.phase);
  return (
    <div className="fn-stage">
      <StageCanvas />
      <div className="fn-stage__vignette" aria-hidden="true" />
      {phase === "lobby" ? <Lobby /> : <Hud />}
      <Countdown />
      {phase === "over" && <Results />}
      <AimOverlay aim={session.aim} players={session.players} dots={false} />
    </div>
  );
}
