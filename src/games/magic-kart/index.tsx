"use client";
import type { ComponentType } from "react";
import type { GameModule } from "@/platform/games/game-api";
import { KartHost } from "./host/kart-host";
import { SessionContext } from "./host/components/session-context";
import { Stage } from "./host/components/Stage";
import { KartPhone } from "./phone/kart-phone";
import { PhoneScreen } from "./phone/components/PhoneScreen";
import { ControllerContext } from "./phone/components/session-context";
import "./styles/host.css";
import "./styles/phone.css";

/**
 * Magic Kart, as the platform sees it. Each room gets one session, and
 * every piece the platform renders is wrapped so it can reach that session.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new KartHost(room);
    const wrap = (Inner: ComponentType): ComponentType =>
      function Wrapped() {
        return (
          <SessionContext.Provider value={session}>
            <Inner />
          </SessionContext.Provider>
        );
      };
    return { Screen: wrap(Stage), dispose: () => session.dispose() };
  },

  createPhone(room) {
    const session = new KartPhone(room);
    function Screen() {
      return (
        <ControllerContext.Provider value={session}>
          <PhoneScreen />
        </ControllerContext.Provider>
      );
    }
    return { Screen, dispose: () => session.dispose() };
  },
};
