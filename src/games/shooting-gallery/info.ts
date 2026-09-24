import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "shooting-gallery",
  title: "Shooting Gallery",
  tagline: "Point your phone to aim. Ducks and targets, top score wins.",
  status: "development",
  players: [1, 2, 4],
  Cover,
};
