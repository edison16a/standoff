"use client";
import { lazy, Suspense } from "react";
import { AimOverlay } from "@/games/kit/aim/AimOverlay";
import { useCounterStore } from "../host-store";
import { Hud } from "./Hud";
import { Lobby } from "./Lobby";
import { Results } from "./Results";
import { useSession } from "./session-context";

// three.js and the models load after the room opens, so the game's own code arrives first.
const BattleCanvas = lazy(() => import("./BattleCanvas"));

/**
 * Counter Battle on the big screen. The field is always there: computer
 * players fighting behind the lobby, then the match split into a view
 * per player. The lobby, the HUD and the results are ordinary React on
 * top, and the aim kit's layer shows each player's calibration targets
 * inside their own view.
 */
export function Stage() {
  const session = useSession();
  const phase = useCounterStore((s) => s.phase);
  return (
    <div className="cb-stage">
      <Suspense fallback={null}>
        <BattleCanvas />
      </Suspense>
      {phase === "lobby" ? <Lobby /> : <Hud />}
      {phase === "results" && <Results />}
      {/* The crosshair in each view is the aim during a match; dots only help while calibrating in the lobby. */}
      <AimOverlay aim={session.aim} players={() => session.players()} dots={phase === "lobby"} />
    </div>
  );
}
