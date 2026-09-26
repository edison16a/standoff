"use client";
import type { GameModule } from "@/platform/games/game-api";
import { BoxingHost } from "./host/boxing-host";
import { SessionContext } from "./host/components/session-context";
import { Stage } from "./host/components/Stage";
import { Showcase } from "./showcase/Showcase";
import "./styles/host.css";
import "./styles/menus.css";
import "./styles/pick.css";
import "./styles/hud.css";
import "./styles/map.css";
import "./styles/overlays.css";
import "./styles/results.css";

/**
 * Boxing, as the platform sees it. It is played in front of the
 * computer's camera, so there is no phone side and no join code.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new BoxingHost(room);
    function Screen() {
      return (
        <SessionContext.Provider value={session}>
          <Stage />
        </SessionContext.Provider>
      );
    }
    return { Screen, join: "hidden", dispose: () => session.dispose() };
  },

  createPhone() {
    // Nobody joins a camera game from a phone, so there is nothing to show.
    return { Screen: () => null, dispose: () => undefined };
  },

  Showcase,
};
