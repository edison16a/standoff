"use client";
import { useFifaStore } from "../host-store";
import { Champions } from "./Champions";
import { Lobby } from "./Lobby";
import { MatchHud } from "./MatchHud";
import PitchCanvas from "./PitchCanvas";

/**
 * Soccer 3v3 on the big screen. The 3D ground is always there: computer
 * players kicking about behind the lobby, then the match, then the
 * trophy ceremony. The lobby, the scoreboard, the winners' names and the
 * stats are ordinary React on top.
 */
export function Stage() {
  const phase = useFifaStore((state) => state.phase);
  return (
    <div className="fifa-stage">
      <PitchCanvas />
      {phase === "lobby" ? <Lobby /> : <MatchHud />}
      {phase === "fulltime" && <Champions />}
    </div>
  );
}
