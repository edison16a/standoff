import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "football-3v3",
  title: "Football 3v3",
  tagline: "Three on three American football under the lights. Call the play, hike it and throw a spiral.",
  status: "ready",
  players: [2, 3, 4, 5, 6],
  color: "#f5c518",
  Cover,
};
