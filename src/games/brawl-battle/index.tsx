"use client";
import type { ComponentType } from "react";
import type { GameModule } from "@/platform/games/game-api";
import { BrawlHost } from "./host/brawl-host";
import { SessionContext } from "./host/components/session-context";
import { Stage } from "./host/components/Stage";
import { BrawlPhone } from "./phone/brawl-phone";
import { PhoneScreen } from "./phone/components/PhoneScreen";
import { ControllerContext } from "./phone/components/session-context";
import "./styles/host.css";
import "./styles/hud.css";
import "./styles/lobby.css";
import "./styles/results.css";
import "./styles/phone.css";
import "./styles/pad.css";

/**
 * Brawl Battle, as the platform sees it. Each room gets one session, and
 * every piece the platform renders is wrapped so it can reach it.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new BrawlHost(room);
    const wrap = (Inner: ComponentType): ComponentType =>
      function Wrapped() {
        return (
          <SessionContext.Provider value={session}>
            <Inner />
          </SessionContext.Provider>
        );
      };
    // The lobby's fighter places fill the middle, so the join code waits in the corner.
    return { Screen: wrap(Stage), join: "corner", dispose: () => session.dispose() };
  },

  createPhone(room) {
    const session = new BrawlPhone(room);
    // Browser tests drive the fake phones through their session. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __brawlPhone: session });
    function Screen() {
      return (
        <ControllerContext.Provider value={session}>
          <PhoneScreen seat={room.seat} />
        </ControllerContext.Provider>
      );
    }
    return { Screen, dispose: () => session.dispose() };
  },
};
