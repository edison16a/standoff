"use client";
import type { ComponentType } from "react";
import type { GameModule } from "@/platform/games/game-api";
import { BladeHost } from "./host/blade-host";
import { SessionContext } from "./host/components/session-context";
import { SoloButton } from "./host/components/SoloButton";
import { Stage } from "./host/components/Stage";
import { Tools } from "./host/components/Tools";
import { BladePhone } from "./phone/blade-phone";
import { PhoneScreen } from "./phone/components/PhoneScreen";
import { ControllerContext } from "./phone/components/session-context";
import { Showcase } from "./showcase/Showcase";
import "./styles/stage.css";
import "./styles/phone.css";
import "./styles/phone-setup.css";
import "./styles/phone-pick.css";
import "./styles/phone-wide.css";

/**
 * Blade Clash, as the platform sees it. Each room gets one session, and
 * every piece the platform renders is wrapped so it can reach that session.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new BladeHost(room);
    const wrap = (Inner: ComponentType): ComponentType =>
      function Wrapped() {
        return (
          <SessionContext.Provider value={session}>
            <Inner />
          </SessionContext.Provider>
        );
      };
    return { Screen: wrap(Stage), Tools: wrap(Tools), JoinExtra: wrap(SoloButton), dispose: () => session.dispose() };
  },

  createPhone(room) {
    const session = new BladePhone(room);
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
