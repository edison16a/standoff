"use client";
import { lazy, Suspense } from "react";
import { useNbaStore } from "../host-store";
import { Champions } from "./Champions";
import { Hud } from "./Hud";
import { Lobby } from "./Lobby";
import { ReplayBar } from "./ReplayBar";
import { Results } from "./Results";

// three.js and the models load after the room opens, so the game's own code arrives first.
const CourtCanvas = lazy(() => import("./CourtCanvas"));

/**
 * Basketball 3v3 on the big screen. The arena is always there: a demo game
 * behind the team picker, then the real game and its trophy ceremony.
 * The lobby, the scoreboard, the winners' names and the results are
 * ordinary React on top.
 */
export function Stage() {
  const phase = useNbaStore((state) => state.phase);
  // The results wait for the replay of the winning basket, then the trophy ceremony.
  const replayDue = useNbaStore((state) => state.replayDue);
  const ceremony = useNbaStore((state) => state.ceremony?.stage ?? null);
  return (
    // Right click holds Guard for the keyboard player, so the browser's menu stays shut over the court.
    <div className="nba-stage" onContextMenu={(e) => e.preventDefault()}>
      <Suspense fallback={null}>
        <CourtCanvas />
      </Suspense>
      {phase === "lobby" ? <Lobby /> : phase === "replay" ? <ReplayBar /> : ceremony ? null : <Hud />}
      {phase === "over" && ceremony && ceremony !== "stats" && <Champions />}
      {phase === "over" && !replayDue && (!ceremony || ceremony === "stats") && <Results />}
    </div>
  );
}
