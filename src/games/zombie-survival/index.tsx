"use client";
import type { ComponentType } from "react";
import type { GameModule } from "@/platform/games/game-api";
import { SessionContext } from "./host/components/session-context";
import { Stage } from "./host/components/Stage";
import { Tools } from "./host/components/Tools";
import { SurvivalHost } from "./host/survival-host";
import { PhoneScreen } from "./phone/components/PhoneScreen";
import { PhoneContext } from "./phone/components/session-context";
import { SurvivalPhone } from "./phone/survival-phone";
import { Showcase } from "./showcase/Showcase";
import "./styles/stage.css";
import "./styles/lobby.css";
import "./styles/hud.css";
import "./styles/radio.css";
import "./styles/cards.css";
import "./styles/checkpoint.css";
import "./styles/phone.css";
import "./styles/phone-ready.css";
import "./styles/phone-play.css";
import "./styles/phone-cards.css";
import "./styles/showcase.css";

/**
 * Zombie Survival, as the platform sees it. Each room gets one session,
 * and every piece the platform renders is wrapped so it can reach it.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new SurvivalHost(room);
    const wrap = (Inner: ComponentType): ComponentType =>
      function Wrapped() {
        return (
          <SessionContext.Provider value={session}>
            <Inner />
          </SessionContext.Provider>
        );
      };
    return { Screen: wrap(Stage), Tools: wrap(Tools), dispose: () => session.dispose() };
  },

  createPhone(room) {
    const session = new SurvivalPhone(room);
    function Screen() {
      return (
        <PhoneContext.Provider value={session}>
          <PhoneScreen />
        </PhoneContext.Provider>
      );
    }
    return { Screen, dispose: () => session.dispose() };
  },

  Showcase,
};
