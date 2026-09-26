"use client";
import type { ComponentType } from "react";
import type { GameModule } from "@/platform/games/game-api";
import { SessionContext } from "./host/components/session-context";
import { Stage } from "./host/components/Stage";
import { NbaHost } from "./host/nba-host";
import { NbaPhone } from "./phone/nba-phone";
import { PhoneScreen } from "./phone/components/PhoneScreen";
import { ControllerContext } from "./phone/components/session-context";
import { Showcase } from "./showcase/Showcase";
import "./styles/host.css";
import "./styles/lobby.css";
import "./styles/hud.css";
import "./styles/results.css";
import "./styles/phone.css";
import "./styles/phone-ready.css";
import "./styles/pad.css";
import "./styles/showcase.css";

/**
 * Basketball 3v3, as the platform sees it. Each room gets one session, and
 * every piece the platform renders is wrapped so it can reach it.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new NbaHost(room);
    const wrap = (Inner: ComponentType): ComponentType =>
      function Wrapped() {
        return (
          <SessionContext.Provider value={session}>
            <Inner />
          </SessionContext.Provider>
        );
      };
    // The lobby's team columns fill the middle, so the join code waits in the corner.
    return { Screen: wrap(Stage), join: "corner", dispose: () => session.dispose() };
  },

  createPhone(room) {
    const session = new NbaPhone(room);
    // Browser tests drive the fake phones through their session. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __nbaPhone: session });
    function Screen() {
      return (
        <ControllerContext.Provider value={session}>
          <PhoneScreen />
        </ControllerContext.Provider>
      );
    }
    return { Screen, dispose: () => session.dispose() };
  },

  Showcase,
};
