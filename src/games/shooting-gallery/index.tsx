"use client";
import type { ComponentType } from "react";
import type { GameModule } from "@/platform/games/game-api";
import { GalleryHost } from "./host/gallery-host";
import { GalleryContext } from "./host/components/session-context";
import { Stage, Tools } from "./host/components/Stage";
import { GalleryPhone } from "./phone/gallery-phone";
import { PhoneScreen } from "./phone/components/PhoneScreen";
import { PhoneContext } from "./phone/components/session-context";
import { ShowcaseScene } from "./showcase/ShowcaseScene";
import "./styles/host.css";
import "./styles/hud.css";
import "./styles/phone.css";
import "./styles/showcase.css";

/**
 * Shooting Gallery, as the platform sees it. Each room gets one session,
 * and every piece the platform renders is wrapped so it can reach it.
 */
export const game: GameModule = {
  createHost(room) {
    const session = new GalleryHost(room);
    // Browser tests read the session to find targets on screen. Never in a production build.
    if (process.env.NODE_ENV === "development") (window as unknown as { __shootingGallery?: GalleryHost }).__shootingGallery = session;
    const wrap = (Inner: ComponentType): ComponentType =>
      function Wrapped() {
        return (
          <GalleryContext.Provider value={session}>
            <Inner />
          </GalleryContext.Provider>
        );
      };
    return { Screen: wrap(Stage), Tools: wrap(Tools), dispose: () => session.dispose() };
  },

  createPhone(room) {
    const session = new GalleryPhone(room);
    function Screen() {
      return (
        <PhoneContext.Provider value={session}>
          <PhoneScreen />
        </PhoneContext.Provider>
      );
    }
    return { Screen, dispose: () => session.dispose() };
  },

  // Part of the game's own chunk, so it is ready the moment the capture tool starts its clock.
  Showcase: ShowcaseScene,
};
