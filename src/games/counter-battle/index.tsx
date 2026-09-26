"use client";
import type { ComponentType } from "react";
import type { GameModule } from "@/platform/games/game-api";
import { CounterHost } from "./host/counter-host";
import { SessionContext } from "./host/components/session-context";
import { Stage } from "./host/components/Stage";
import { CounterPhone } from "./phone/counter-phone";
import { PhoneScreen } from "./phone/components/PhoneScreen";
import { PhoneContext } from "./phone/components/session-context";
import { Showcase } from "./showcase/Showcase";
import "./styles/host.css";
import "./styles/lobby.css";
import "./styles/hud.css";
import "./styles/results.css";
import "./styles/phone.css";
import "./styles/play.css";

/**
 * Counter Battle, as the platform sees it. Each room gets one session,
 * and every piece the platform renders is wrapped so it can reach it.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new CounterHost(room);
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
    const session = new CounterPhone(room);
    // Browser tests drive the fake phones through their session. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __cbPhone: session });
    function Screen() {
      return (
        <PhoneContext.Provider value={session}>
          <PhoneScreen seat={room.seat} />
        </PhoneContext.Provider>
      );
    }
    return { Screen, dispose: () => session.dispose() };
  },

  Showcase,
};
