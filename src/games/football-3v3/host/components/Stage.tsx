"use client";
import { useFootballStore } from "../host-store";
import { Champions } from "./Champions";
import FieldCanvas from "./FieldCanvas";
import { GameHud } from "./GameHud";
import { Lobby } from "./Lobby";
import { Results } from "./Results";

/**
 * Football 3v3 on the big screen. The 3D stadium is always there:
 * computer players having a game behind the lobby, then the real game,
 * then the trophy presentation. The lobby, the broadcast graphics, the
 * winners' names and the end screen are ordinary React on top.
 */
export function Stage() {
  const phase = useFootballStore((state) => state.phase);
  const stage = useFootballStore((state) => state.ceremony?.stage ?? null);
  // With a winner the stats wait for the presentation; after a tie they come at once.
  const results = phase === "over" && (stage === null || stage === "stats");
  return (
    <div className="fb-stage">
      <FieldCanvas />
      {phase === "lobby" ? <Lobby /> : <GameHud />}
      {phase === "over" && <Champions />}
      {results && <Results />}
    </div>
  );
}
