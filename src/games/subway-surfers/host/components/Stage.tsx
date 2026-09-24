"use client";
import { lazy, Suspense } from "react";
import { CornerPreview } from "@/games/kit/camera";
import { useSurfStore } from "../store";
import { CalibrateStep, CameraStep } from "./CameraStep";
import { Lobby } from "./Lobby";
import { Results } from "./Results";
import { RunHud } from "./RunHud";
import { useSession } from "./session-context";

// three.js and the models load after the room opens, so the menus arrive first.
const RunCanvas = lazy(() => import("./RunCanvas"));

/**
 * Subway Surfers on the big screen. The 3D view is always there: a demo
 * run behind the menus, then each player's own run. The menus, camera
 * steps, overlay and results are ordinary React on top.
 */
export function Stage() {
  const session = useSession();
  const phase = useSurfStore((s) => s.phase);
  const kit = session.kit;
  const playing = phase === "tutorial" || phase === "countdown" || phase === "running" || phase === "results";
  return (
    <div className="ss-stage">
      <Suspense fallback={null}>
        <RunCanvas />
      </Suspense>
      {phase !== "lobby" && !playing && <div className="ss-dim" />}
      {phase === "lobby" && <Lobby />}
      {phase === "camera" && kit && <CameraStep kit={kit} />}
      {phase === "calibrate" && kit && <CalibrateStep kit={kit} />}
      {playing && <RunHud />}
      {phase === "results" && <Results />}
      {playing && kit && <CornerPreview kit={kit} corner="bottom-right" width={240} />}
    </div>
  );
}
