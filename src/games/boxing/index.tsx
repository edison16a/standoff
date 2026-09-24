"use client";
import type { GameModule } from "@/platform/games/game-api";
import { Showcase } from "./showcase/Showcase";

/** Boxing, as the platform sees it. Played in front of the computer's camera, with no phones. */
export const game: GameModule = {
  createHost() {
    return { Screen: () => null, join: "hidden", dispose: () => undefined };
  },
  createPhone() {
    return { Screen: () => null, dispose: () => undefined };
  },
  Showcase,
};
