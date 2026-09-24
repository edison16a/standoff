"use client";
import { lazy, Suspense } from "react";
import { useKartStore } from "../host-store";
import { Lobby } from "./Lobby";
import { RaceHud } from "./RaceHud";
import { Results } from "./Results";

// three.js and the models load after the room opens, so the game's own code arrives first.
const RaceCanvas = lazy(() => import("./RaceCanvas"));

/**
 * Magic Kart on the big screen. The 3D view is always there: the chosen
 * map's demo race behind the lobby, then the split screen race. The
 * lobby, the race overlay and the results are ordinary React on top.
 */
export function Stage() {
  const phase = useKartStore((state) => state.phase);
  return (
    <div className="mk-stage">
      <Suspense fallback={null}>
        <RaceCanvas />
      </Suspense>
      {phase === "lobby" ? <Lobby /> : <RaceHud />}
      {phase === "results" && <Results />}
    </div>
  );
}
