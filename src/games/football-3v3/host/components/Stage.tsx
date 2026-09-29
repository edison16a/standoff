"use client";
import { useFootballStore } from "../host-store";
import FieldCanvas from "./FieldCanvas";
import { GameHud } from "./GameHud";
import { Lobby } from "./Lobby";
import { Results } from "./Results";

/**
 * Football 3v3 on the big screen. The 3D stadium is always there:
 * computer players having a game behind the lobby, then the real game.
 * The lobby, the broadcast graphics and the end screen are ordinary
 * React on top.
 */
export function Stage() {
  const phase = useFootballStore((state) => state.phase);
  return (
    <div className="fb-stage">
      <FieldCanvas />
      {phase === "lobby" ? <Lobby /> : <GameHud />}
      {phase === "over" && <Results />}
    </div>
  );
}
