"use client";
import type { ComponentType } from "react";
import type { GameModule } from "@/platform/games/game-api";
import { FifaHost } from "./host/fifa-host";
import { SessionContext } from "./host/components/session-context";
import { Stage } from "./host/components/Stage";
import { FifaPhone } from "./phone/fifa-phone";
import { PhoneScreen } from "./phone/components/PhoneScreen";
import { PhoneContext } from "./phone/components/session-context";
import Showcase from "./showcase/Showcase";
import "./styles/host.css";
import "./styles/lobby.css";
import "./styles/results.css";
import "./styles/phone.css";
import "./styles/phone-ready.css";
import "./styles/pad.css";
import "./styles/showcase.css";

/**
 * Soccer 3v3, as the platform sees it. Each room gets one session, and
 * every piece the platform renders is wrapped so it can reach it.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new FifaHost(room);
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
    const session = new FifaPhone(room);
    // Browser tests drive the test phones' pads from here. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __fifaPhone: session });
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
