"use client";
import type { GameModule } from "@/platform/games/game-api";
import { SessionContext } from "./host/components/session-context";
import { Stage } from "./host/components/Stage";
import { SurfSession } from "./host/session";
import { Showcase } from "./showcase/Showcase";
import "./styles/host.css";
import "./styles/hud.css";
import "./styles/menus.css";
import "./styles/showcase.css";

/**
 * Subway Runner, as the platform sees it. It is played in front of the
 * computer's camera, so there is no phone side and no join code.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new SurfSession(room);
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
    // No seats are offered for a camera game, so no phone ever gets here.
    function Screen() {
      return <p className="ss-phone">Subway Runner is played in front of the computer&apos;s camera.</p>;
    }
    return { Screen, dispose: () => undefined };
  },

  Showcase,
};
