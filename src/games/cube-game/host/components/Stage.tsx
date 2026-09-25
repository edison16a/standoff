"use client";
import { lazy, Suspense } from "react";
import { CornerPreview } from "@/games/kit/camera";
import { IconButton } from "@/components/ui/IconButton";
import { useCubeStore } from "../store";
import { CalibrateStep, CameraStep } from "./CameraStep";
import { Hud } from "./Hud";
import { LevelSelect } from "./LevelSelect";
import { Results } from "./Results";
import { useSession } from "./session-context";

// three.js and the levels load after the room opens, so the menu's words arrive first.
const GameCanvas = lazy(() => import("./GameCanvas"));

/**
 * Cube Game on the big screen. The 3D view is always there: a computer
 * run of the chosen level behind the menu, then the players' own runs.
 * Menus, camera steps, HUD and results are plain React on top.
 */
export function Stage() {
  const session = useSession();
  const phase = useCubeStore((s) => s.phase);
  const input = useCubeStore((s) => s.input);
  const kit = session.kit;
  const playing = phase === "play" || phase === "results";
  return (
    <div className={`cg-stage cg-stage--${phase}`}>
      <Suspense fallback={null}>
        <GameCanvas />
      </Suspense>
      {phase !== "play" && <div className={`cg-dim cg-dim--${phase}`} />}
      {phase === "menu" && <LevelSelect />}
      {phase === "camera" && kit && <CameraStep kit={kit} />}
      {phase === "calibrate" && kit && <CalibrateStep kit={kit} />}
      {playing && <Hud />}
      {phase === "results" && <Results />}
      {playing && input === "camera" && kit && <CornerPreview kit={kit} corner="bottom-right" width={220} />}
    </div>
  );
}

/** The tool bar button: back to the level select, whenever a round or setup is on. */
export function Tools() {
  const session = useSession();
  const phase = useCubeStore((s) => s.phase);
  if (phase === "menu") return null;
  return <IconButton icon="leave" label="Back to the levels" onClick={() => session.toMenu()} />;
}
