"use client";
import { lazy, Suspense, type ComponentType } from "react";
import type { GameModule, ShowcaseView } from "@/platform/games/game-api";
import { SessionContext } from "./host/components/session-context";
import { Stage, Tools } from "./host/components/Stage";
import { CubeSession } from "./host/session";
import "./styles/host.css";
import "./styles/menu.css";
import "./styles/hud.css";
import "./styles/showcase.css";

// The showcase brings three.js and every level with it, so it loads only on the capture page.
const ShowcaseScene = lazy(() => import("./showcase/ShowcaseScene"));

function Showcase({ view }: { view: ShowcaseView }) {
  return (
    <Suspense fallback={null}>
      <ShowcaseScene view={view} />
    </Suspense>
  );
}

/**
 * Cube Game, as the platform sees it. It is played in front of the
 * computer's camera, so there is no phone side and no join code.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new CubeSession(room);
    const wrap = (Inner: ComponentType): ComponentType =>
      function Wrapped() {
        return (
          <SessionContext.Provider value={session}>
            <Inner />
          </SessionContext.Provider>
        );
      };
    return { Screen: wrap(Stage), Tools: wrap(Tools), join: "hidden", dispose: () => session.dispose() };
  },

  createPhone() {
    // No seats are offered for a camera game, so no phone ever gets here.
    function Screen() {
      return <p className="cg-phone">Cube Game is played in front of the computer&apos;s camera.</p>;
    }
    return { Screen, dispose: () => undefined };
  },

  Showcase,
};
