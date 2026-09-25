"use client";
import { lazy, Suspense } from "react";
import { CornerPreview } from "@/games/kit/camera";
import { useBoxingStore } from "../host-store";
import { CameraTrouble } from "./CameraTrouble";
import { FightHud } from "./FightHud";
import { PickScreen } from "./PickScreen";
import { PlayersMenu } from "./PlayersMenu";
import { Results } from "./Results";
import { useSession } from "./session-context";
import { Setup } from "./Setup";

// three.js and the boxers load after the room opens, so the menus arrive first.
const FightCanvas = lazy(() => import("./FightCanvas"));

/**
 * Boxing on the big screen. The 3D picture is always there, with a demo
 * fight behind the menus; each step of the flow is ordinary React on top.
 */
export function Stage() {
  const session = useSession();
  const screen = useBoxingStore((state) => state.screen);
  return (
    <div className="bx-stage">
      <Suspense fallback={null}>
        <FightCanvas />
      </Suspense>
      {screen !== "fight" && screen !== "results" && <div className="bx-stage__shade" />}
      {screen === "players" && <PlayersMenu />}
      {screen === "setup" && <Setup />}
      {screen === "pick" && <PickScreen />}
      {(screen === "fight" || screen === "results") && <FightHud />}
      {screen === "results" && <Results />}
      {(screen === "pick" || screen === "fight") && session.kit && <CornerPreview kit={session.kit} corner="bottom-right" width={240} />}
      {screen !== "players" && screen !== "setup" && session.kit && <CameraTrouble kit={session.kit} />}
    </div>
  );
}
