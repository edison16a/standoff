"use client";
import { useFifaStore } from "../host-store";
import { Lobby } from "./Lobby";
import { MatchHud } from "./MatchHud";
import PitchCanvas from "./PitchCanvas";
import { Results } from "./Results";

/**
 * Soccer 3v3 on the big screen. The 3D ground is always there: computer
 * players kicking about behind the lobby, then the match. The lobby, the
 * scoreboard and the results are ordinary React on top.
 */
export function Stage() {
  const phase = useFifaStore((state) => state.phase);
  return (
    <div className="fifa-stage">
      <PitchCanvas />
      {phase === "lobby" ? <Lobby /> : <MatchHud />}
      {phase === "fulltime" && <Results />}
    </div>
  );
}
