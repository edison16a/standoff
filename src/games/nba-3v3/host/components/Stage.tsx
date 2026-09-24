"use client";
import { lazy, Suspense } from "react";
import { useNbaStore } from "../host-store";
import { Hud } from "./Hud";
import { Lobby } from "./Lobby";
import { Results } from "./Results";

// three.js and the models load after the room opens, so the game's own code arrives first.
const CourtCanvas = lazy(() => import("./CourtCanvas"));

/**
 * NBA 3v3 on the big screen. The arena is always there: a demo game
 * behind the team picker, then the real game. The lobby, the scoreboard
 * and the results are ordinary React on top.
 */
export function Stage() {
  const phase = useNbaStore((state) => state.phase);
  return (
    <div className="nba-stage">
      <Suspense fallback={null}>
        <CourtCanvas />
      </Suspense>
      {phase === "lobby" ? <Lobby /> : <Hud />}
      {phase === "over" && <Results />}
    </div>
  );
}
