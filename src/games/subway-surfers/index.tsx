"use client";
import type { GameModule } from "@/platform/games/game-api";
import { SessionContext } from "./host/components/session-context";
import { Stage } from "./host/components/Stage";
import { SurfSession } from "./host/session";
import { keyboard } from "./keyboard";
import { Showcase } from "./showcase/Showcase";
import "./styles/host.css";
import "./styles/hud.css";
import "./styles/menus.css";
import "./styles/board.css";
import "./styles/scoring.css";
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
    // Only the admin panel's Keyboard player takes a seat here. Its keys are on the big screen.
    function Screen() {
      return <p className="ss-phone">Subway Runner is played in front of the computer&apos;s camera. Playing with the keys? They are on the big screen.</p>;
    }
    return { Screen, dispose: () => undefined };
  },

  Showcase,
  keyboard,
};
