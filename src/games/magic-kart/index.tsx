"use client";
import { lazy, Suspense, type ComponentType } from "react";
import type { GameModule, ShowcaseView } from "@/platform/games/game-api";
import { KartHost } from "./host/kart-host";
import { SessionContext } from "./host/components/session-context";
import { Stage } from "./host/components/Stage";
import { KartPhone } from "./phone/kart-phone";
import { PhoneScreen } from "./phone/components/PhoneScreen";
import { ControllerContext } from "./phone/components/session-context";
import "./styles/host.css";
import "./styles/lobby.css";
import "./styles/hud.css";
import "./styles/results.css";
import "./styles/phone.css";
import "./styles/pick.css";
import "./styles/drive.css";
import "./styles/power.css";

// The showcase brings three.js and every map with it, so it loads only on the capture page, never on a phone.
const ShowcaseScene = lazy(() => import("./showcase/ShowcaseScene"));

function Showcase({ view }: { view: ShowcaseView }) {
  return (
    <Suspense fallback={null}>
      <ShowcaseScene view={view} />
    </Suspense>
  );
}

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
    // The lobby's title and map picker fill the middle, so the join code waits in the corner.
    return { Screen: wrap(Stage), join: "corner", dispose: () => session.dispose() };
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

  Showcase,
};
