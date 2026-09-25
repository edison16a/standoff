"use client";
import { lazy, Suspense } from "react";
import { useBrawlStore } from "../host-store";
import { Hud } from "./Hud";
import { Lobby } from "./Lobby";
import { Results } from "./Results";

// three.js and the models load after the room opens, so the game's own code arrives first.
const ArenaCanvas = lazy(() => import("./ArenaCanvas"));

/**
 * Brawl Battle on the big screen. The stage is always there: computer
 * fighters brawling behind the lobby, then the real match. The lobby,
 * the HUD and the results are ordinary React on top.
 */
export function Stage() {
  const phase = useBrawlStore((state) => state.phase);
  return (
    <div className="bb-stage">
      <Suspense fallback={null}>
        <ArenaCanvas />
      </Suspense>
      {phase === "lobby" ? <Lobby /> : <Hud />}
      {phase === "results" && <Results />}
    </div>
  );
}
