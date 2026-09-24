import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "go-kart",
  title: "Go-Kart Racing",
  tagline: "Steer on your phone screen. First over the line wins.",
  status: "development",
  players: [1, 2, 4],
  Cover,
};
