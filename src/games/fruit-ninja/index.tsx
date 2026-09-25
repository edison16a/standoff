"use client";
import type { GameModule } from "@/platform/games/game-api";
import { FruitHost } from "./host/fruit-host";
import { SessionContext } from "./host/components/session-context";
import { Stage } from "./host/components/Stage";
import { FruitPhone } from "./phone/fruit-phone";
import { PhoneScreen } from "./phone/components/PhoneScreen";
import { PhoneContext } from "./phone/components/session-context";
import Showcase from "./showcase/Showcase";
import "./styles/host.css";
import "./styles/lobby.css";
import "./styles/round.css";
import "./styles/popups.css";
import "./styles/results.css";
import "./styles/phone.css";
import "./styles/play.css";
import "./styles/showcase.css";

/**
 * Fruit Ninja, as the platform sees it. Each room gets one session, and
 * the screen the platform renders is wrapped so it can reach it.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new FruitHost(room);
    function Screen() {
      return (
        <SessionContext.Provider value={session}>
          <Stage />
        </SessionContext.Provider>
      );
    }
    return { Screen, dispose: () => session.dispose() };
  },

  createPhone(room) {
    const session = new FruitPhone(room);
    function Screen() {
      return (
        <PhoneContext.Provider value={session}>
          <PhoneScreen />
        </PhoneContext.Provider>
      );
    }
    return { Screen, dispose: () => session.dispose() };
  },

  // Loaded with the module, not lazily, so the capture tool never films an empty frame.
  Showcase,
};
